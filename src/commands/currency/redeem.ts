import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import {
  BROKE_COOLDOWN,
  BROKE_THRESHOLD,
  TZAPI_TO_GIVE_WHEN_BROKE,
} from "../../lib/constants.js";
import { getUser, updateUser } from "../../lib/db/user.js";
import { handleDefer } from "../../lib/utils/customReply.js";
import { getActiveGames } from "../../lib/utils/game.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("redeem")
    .setDescription(`Get ${TZAPI_TO_GIVE_WHEN_BROKE} Tzapi when broke`),
  async execute(interaction: CommandInteraction) {
    const deferHandler = handleDefer(interaction);
    deferHandler.start();

    const discordId = interaction.user.id;

    const { error, user } = getUser(discordId);
    if (error || !user) {
      interaction.customReply(error);
      deferHandler.cancel();

      return;
    }

    if (user.balance.nicu || user.balance.tzapi >= BROKE_THRESHOLD) {
      interaction.customReply(
        `You fool! You are not broke enough to redeem yet.`
      );
      deferHandler.cancel();

      return;
    }

    if (user.lastRedeemed) {
      const now = new Date();
      const difference = now.getTime() - new Date(user.lastRedeemed).getTime();
      const differenceInHours = Math.floor(difference / 1000 / 60 / 60);
      if (differenceInHours < BROKE_COOLDOWN) {
        interaction.customReply(
          `You fool! You already used this command earlier. ${
            BROKE_COOLDOWN - differenceInHours
          } hours left before you can use it again.`
        );
        deferHandler.cancel();

        return;
      }
    }

    const { games } = await getActiveGames();

    // Don't allow if they've bet on an active match until the match is over.
    if (games && games.length > 0) {
      for (const game of games) {
        for (const bet of game.bets) {
          if (bet.discordId === discordId) {
            interaction.customReply(
              `You fool! You have currency in an unfinished match! You've bet on ${game.player}'s match`
            );
            deferHandler.cancel();

            return;
          }
        }
      }
    }

    const updatedUserDb = {
      ...user,
      lastRedeemed: new Date(),
      balance: {
        ...user.balance,
        tzapi: user.balance.tzapi + TZAPI_TO_GIVE_WHEN_BROKE,
      },
    };

    const { error: errorUpdate } = updateUser(updatedUserDb);
    if (errorUpdate) {
      interaction.customReply(
        `An error has occured trying to update user <@${discordId}>`
      );
      deferHandler.cancel();

      return;
    }

    interaction.customReply(
      `<@${discordId}> is a broke fool! I pity you so I'll give you 100 Tzapi. Make sure not to lose all of them on a single match!`
    );
    deferHandler.cancel();
  },
};
