import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
} from "discord.js";
import { NICU_IN_TZAPI } from "../constants.js";
import { logInteractionUsage } from "../db/logging.js";
import { getAllUsers } from "../db/user.js";
import { getCheckButton } from "./check.js";

export async function showLeaderboard(
  interaction: CommandInteraction | ButtonInteraction
) {
  const { error, users } = await getLeaderboard(interaction.guildId!);

  if (error || !users) {
    interaction.reply(error ?? "Error loading users.");
    logInteractionUsage(interaction);

    return;
  }

  const usersByCurrency = users!.map(
    (user, index) =>
      `${index + 1}. <@${user.discordId}>\n${user.balance.nicu} Nicu and ${
        user.balance.tzapi
      } Tzapi\n${
        Math.round((user.wins / (user.wins + user.losses)) * 100 * 10) / 10
      }% Winrate`
  );
  const content = `Leaderboard\n${usersByCurrency.join("\n\n")}\n`;
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(getCheckButton()),
  ];

  interaction.reply({ content, components });
  logInteractionUsage(interaction, true);
}

async function getLeaderboard(guildId: string) {
  try {
    const { error, users } = getAllUsers(guildId);

    if (error || !users || users.length === 0) {
      return {
        error:
          "No users found. Try using /currency or betting on a match first.",
        users: undefined,
      };
    }

    users.sort((a, b) => {
      const aTotalTzapi = a.balance.tzapi + a.balance.nicu * NICU_IN_TZAPI;
      const bTotalTzapi = b.balance.tzapi + b.balance.nicu * NICU_IN_TZAPI;

      return bTotalTzapi - aTotalTzapi;
    });

    return {
      error: undefined,
      users,
    };
  } catch (err) {
    return {
      error: "Users not found.",
      users: undefined,
    };
  }
}

export function getLeaderboardButton(primary: boolean) {
  return new ButtonBuilder()
    .setLabel("Leaderboard")
    .setCustomId("leaderboard")
    .setStyle(primary ? ButtonStyle.Primary : ButtonStyle.Secondary);
}
