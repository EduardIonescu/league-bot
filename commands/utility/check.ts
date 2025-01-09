import {
  CommandInteraction,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import { getAccounts, getSpectatorData, toTitleCase } from "../../utils.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("check")
    .setDescription("Check if any account is in game"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const { error, accounts } = await getAccounts();

    if (error || !accounts || accounts.length === 0) {
      await interaction.editReply(
        "No accounts are saved. Try saving some accounts first with `/add`"
      );

      return;
    }

    const accountsInGame = [];
    for (const account of accounts) {
      const spectatorData = await getSpectatorData(
        account.summonerPUUID,
        account.region
      );

      // Wait so you dont get too many requests status from the API
      await setTimeout(200);
      if (!spectatorData || spectatorData.status) {
        continue;
      }

      accountsInGame.push({
        ...account,
        gameStartTime: spectatorData.gameStartTime,
      });
    }

    if (!accountsInGame || accountsInGame.length === 0) {
      await interaction.editReply("No players are in game right now.");

      return;
    }

    const msg: string[] = [];
    for (const account of accountsInGame) {
      const player = `${toTitleCase(
        account.gameName
      )}#${account.tagLine.toUpperCase()}`;
      const isInGameMessage = "is in game since";
      const relativeTime = time(
        new Date(account.gameStartTime),
        TimestampStyles.RelativeTime
      );

      msg.push(player + " " + isInGameMessage + " " + relativeTime);
    }

    await interaction.editReply(msg.join("\n"));
    return;
  },
};
