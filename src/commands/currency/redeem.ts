import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import {
  BROKE_COOLDOWN,
  BROKE_THRESHOLD,
  TZAPI_TO_GIVE_WHEN_BROKE,
} from "../../lib/constants.js";
import {
  getActiveGames,
  getBettingUser,
  updateUser,
} from "../../lib/utils/game.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("redeem")
    .setDescription(`Get ${TZAPI_TO_GIVE_WHEN_BROKE} Tzapi when broke`),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    const discordId = interaction.user.id;

    const { error, user: bettingUser } = await getBettingUser(discordId);

    if (error || !bettingUser) {
      await interaction.editReply(error);
      return;
    }

    if (
      bettingUser.currency.nicu ||
      bettingUser.currency.tzapi >= BROKE_THRESHOLD
    ) {
      await interaction.editReply(
        `You fool! You are not broke enough to redeem yet.`
      );
      return;
    }

    if (bettingUser.timestamp.lastRedeemed) {
      const now = new Date();
      const difference =
        now.getTime() - new Date(bettingUser.timestamp.lastRedeemed).getTime();
      const differenceInHours = Math.floor(difference / 1000 / 60 / 60);
      if (differenceInHours < BROKE_COOLDOWN) {
        await interaction.editReply(
          `You fool! You already used this command earlier. ${
            BROKE_COOLDOWN - differenceInHours
          } hours left before you can use it again.`
        );
        return;
      }
    }

    const { games } = await getActiveGames();

    // Don't allow if they've bet on an active match until the match is over.
    if (games && games.length > 0) {
      for (const game of games) {
        for (const bet of game.bets) {
          if (bet.discordId === discordId) {
            await interaction.editReply(
              `You fool! You have currency in an unfinished match! You've bet on ${game.player}'s match`
            );
            return;
          }
        }
      }
    }

    const updatedUser = {
      ...bettingUser,
      timestamp: { ...bettingUser.timestamp, lastRedeemed: new Date() },
      currency: {
        ...bettingUser.currency,
        tzapi: bettingUser.currency.tzapi + TZAPI_TO_GIVE_WHEN_BROKE,
      },
    };
    const { error: errorUser } = await updateUser(updatedUser);
    if (errorUser) {
      await interaction.editReply(
        `An error has occured trying to update user <@${discordId}>`
      );
      return;
    }

    await interaction.editReply(
      `<@${discordId}> is a broke fool! I pity you so I'll give you 100 Tzapi. Make sure not to lose all of them on a single match!`
    );
  },
};
