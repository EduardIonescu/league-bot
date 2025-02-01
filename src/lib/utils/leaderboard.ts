import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
} from "discord.js";
import * as fs from "node:fs/promises";
import { NICU_IN_TZAPI } from "../constants.js";
import { BettingUser } from "../types/common.js";
import { getCheckButton } from "./check.js";

export async function showLeaderboard(
  interaction: CommandInteraction | ButtonInteraction
) {
  const { error, users } = await getLeaderboard();

  if (error || !users) {
    interaction.reply(error ?? "Error loading users.");
    return;
  }

  const usersByCurrency = users!.map(
    (user, index) =>
      `${index + 1}. <@${user.discordId}>\n${user.currency.nicu} Nicu and ${
        user.currency.tzapi
      } Tzapi\n${
        Math.round(
          (user.data.wins / (user.data.wins + user.data.loses)) * 100 * 10
        ) / 10
      }% Winrate`
  );
  const content = `Leaderboard\n${usersByCurrency.join("\n\n")}\n`;
  const components = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(getCheckButton()),
  ];

  interaction.reply({ content, components });
}

async function getLeaderboard() {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const userFolderPath = new URL("src/data/users/", rootPath);
    const userFolder = await fs.readdir(userFolderPath);

    const users: BettingUser[] = await Promise.all(
      userFolder.map(async (userFile) => {
        const filePath = new URL(userFile, userFolderPath);
        const user: BettingUser = JSON.parse(
          await fs.readFile(filePath, "utf8")
        );
        return user;
      })
    );

    if (users.length === 0) {
      return {
        error:
          "No users found. Try using /currency or betting on a match first.",
        users: undefined,
      };
    }

    users.sort((a, b) => {
      const aTotalTzapi = a.currency.tzapi + a.currency.nicu * NICU_IN_TZAPI;
      const bTotalTzapi = b.currency.tzapi + b.currency.nicu * NICU_IN_TZAPI;

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
