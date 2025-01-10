import {
  CommandInteraction,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import {
  formatPlayerName,
  getAccounts,
  getSpectatorData,
} from "../../utils.js";

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
      if (
        !spectatorData ||
        typeof spectatorData === "string" ||
        spectatorData.status
      ) {
        continue;
      }

      if (!spectatorData.gameStartTime) {
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
      const player = formatPlayerName(account.gameName, account.tagLine);
      const isInGameMessage = "is in game since";
      console.log("account", account);
      console.log("account.gameStartTime", account.gameStartTime);
      const relativeTime = time(
        new Date(account.gameStartTime),
        TimestampStyles.RelativeTime
      );

      msg.push(`\`${player}\` ${isInGameMessage} ${relativeTime}`);
    }

    await interaction.editReply(msg.join("\n"));
    return;
  },
};
