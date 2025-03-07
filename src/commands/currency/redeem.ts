import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import {
  BROKE_COOLDOWN,
  BROKE_THRESHOLD,
  TZAPI_TO_GIVE_WHEN_BROKE,
} from "../../lib/constants.js";
import { logInteractionUsage } from "../../lib/db/logging.js";
import { getActiveMatches, getBets } from "../../lib/db/match.js";
import { getOrAddUserIfAbsent, updateUser } from "../../lib/db/user.js";
import { handleDefer } from "../../lib/utils/customReply.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("redeem")
    .setDescription(`Get ${TZAPI_TO_GIVE_WHEN_BROKE} Tzapi when broke`),
  async execute(interaction: CommandInteraction) {
    const deferHandler = handleDefer(interaction);
    deferHandler.start();

    const discordId = interaction.user.id;

    const { error, user } = getOrAddUserIfAbsent(
      discordId,
      interaction.guildId!
    );
    if (error || !user) {
      interaction.customReply(error);
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    if (user.balance.nicu || user.balance.tzapi >= BROKE_THRESHOLD) {
      interaction.customReply(
        `You fool! You are not broke enough to redeem yet.`
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

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
        logInteractionUsage(interaction);

        return;
      }
    }

    const { matches } = getActiveMatches();

    // Don't allow if they've bet on an active match until the match is over.
    if (matches && matches.length > 0) {
      for (const match of matches) {
        const { bets } = getBets(match.gameId, interaction.guildId!);
        if (!bets) {
          continue;
        }

        for (const bet of bets) {
          if (bet.discordId === discordId) {
            interaction.customReply(
              `You fool! You have currency in an unfinished match! You've bet on ${match.player}'s match`
            );
            deferHandler.cancel();
            logInteractionUsage(interaction);

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
      logInteractionUsage(interaction);

      return;
    }

    interaction.customReply(
      `<@${discordId}> is a broke fool! I pity you so I'll give you 100 Tzapi. Make sure not to lose all of them on a single match!`
    );
    deferHandler.cancel();
    logInteractionUsage(interaction, true);
  },
};
