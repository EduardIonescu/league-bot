import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
} from "discord.js";
import * as fs from "node:fs/promises";
import { BettingUser } from "../types/common.js";
import { getCheckButton } from "./check.js";

export async function showLeaderboard(
  interaction: CommandInteraction | ButtonInteraction
) {
  await interaction.deferReply();

  const { error, users } = await getLeaderboard();

  if (error || !users || users.length === 0) {
    await interaction.editReply(error ?? "Error loading users.");
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
  await interaction.editReply({ content, components });
}

async function getLeaderboard() {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const userFolderPath = new URL("src/data/users/", rootPath);
    const userFolder = await fs.readdir(userFolderPath);

    const users: BettingUser[] = [];
    for (const userFile of userFolder) {
      const filePath = new URL(userFile, userFolderPath);
      const user: BettingUser = JSON.parse(await fs.readFile(filePath, "utf8"));
      users.push(user);
    }

    users.sort((a, b) => {
      if (b.currency.nicu === a.currency.nicu) {
        return b.currency.tzapi - a.currency.tzapi;
      } else {
        return b.currency.nicu - a.currency.nicu;
      }
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
