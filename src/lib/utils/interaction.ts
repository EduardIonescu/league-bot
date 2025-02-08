import {
  ButtonInteraction,
  CommandInteraction,
  EmbedBuilder,
  Message,
  MessageFlags,
  TextBasedChannel,
} from "discord.js";
import { setTimeout } from "node:timers";
import { logInteractionUsage } from "../db/logging.js";
import { addActiveMatch, addMessage, getActiveMatch } from "../db/match.js";
import { Account } from "../types/riot.js";
import {
  bettingButtons,
  canBetOnActiveGame,
  formatPlayerName,
  getTotalBets,
} from "./game.js";
import { fetchSpectatorData } from "./riot.js";

export async function startBet(
  interaction: CommandInteraction | ButtonInteraction,
  account?: Account
) {
  await interaction.deferReply();

  if (!account) {
    interaction.editReply("Account not found. Try saving it first with `/add`");
    logInteractionUsage(interaction);

    return;
  }

  const { summonerPUUID } = account;
  console.log("account", account);
  const player = formatPlayerName(account.gameName, account.tagLine);

  const channel = interaction.channel as TextBasedChannel;

  let { error: errorDb, match, bets, messages } = getActiveMatch(summonerPUUID);

  if (errorDb || !match) {
    try {
      const { error, spectatorData } = await fetchSpectatorData(
        summonerPUUID,
        account.region
      );

      if (error || !spectatorData) {
        interaction.editReply(`${player} is not in game`);
        logInteractionUsage(interaction);

        return;
      }

      if (
        !(spectatorData.gameQueueConfigId === 420) &&
        !(spectatorData.gameQueueConfigId === 440)
      ) {
        interaction.editReply(
          `You can't bet on ${spectatorData.gameMode} games. You can only bet on Ranked Solo/Duo and Ranked Flex games.`
        );
        logInteractionUsage(interaction);

        return;
      }

      match = {
        gameId: spectatorData.gameId,
        region: account.region,
        gameQueueConfigId: spectatorData.gameQueueConfigId,
        gameMode: spectatorData.gameMode,
        gameType: spectatorData.gameType,
        player,
        inGameTime: spectatorData.gameLength,
        summonerPUUID,
        gameStartTime: spectatorData.gameStartTime,
      };

      const { canBet } = canBetOnActiveGame(match.gameStartTime);

      if (!canBet) {
        interaction.editReply({
          content: "Betting window has closed. Better luck on the next one!",
          // flags: MessageFlags.Ephemeral,
        });
        logInteractionUsage(interaction);

        return;
      }

      addActiveMatch(match);
    } catch (err) {
      interaction.editReply(`${player} is not in game`);
      logInteractionUsage(interaction);

      return;
    }
  }

  const { totalBetWin, totalBetLose } = getTotalBets(bets ?? []);

  const totalNicuWinMsg = totalBetWin.nicu ? `${totalBetWin.nicu} Nicu ` : "";
  const totalNicuLoseMsg = totalBetLose.nicu
    ? `${totalBetLose.nicu} Nicu `
    : "";

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("League Bets :coin:")
    .setDescription(`We betting on \`${player}\`'s match against the COMPUTER.`)
    .addFields(
      { name: "\u200b", value: "\u200b" },
      {
        name: "Win",
        value: `${totalNicuWinMsg}${totalBetWin.tzapi} Tzapi`,
        inline: true,
      },
      {
        name: "Lose",
        value: `${totalNicuLoseMsg}${totalBetLose.tzapi} Tzapi`,
        inline: true,
      },
      { name: "Total Bets Placed", value: `${(bets ?? []).length}` },
      { name: "\u200b", value: "\u200b" }
    )
    .setTimestamp();

  const { canBet, timeLeftInSeconds } = canBetOnActiveGame(match.gameStartTime);
  if (!canBet) {
    await interaction.editReply({
      embeds: [embed],
      components: [],
    });
    interaction.followUp({
      content: "Betting window has closed. Better luck on the next one!",
      flags: MessageFlags.Ephemeral,
    });
    logInteractionUsage(interaction);

    return;
  }

  const { winRow, loseRow } = bettingButtons(summonerPUUID);

  const response: Message = await interaction.editReply({
    embeds: [embed],
    components: [winRow, loseRow],
  });

  const isMessageIdSaved = messages?.find(
    (s) => s.channelId === channel.id && s.messageId === response.id
  );
  if (!isMessageIdSaved) {
    const message = {
      channelId: channel.id,
      messageId: response.id,
      gameId: match.gameId,
    };
    addMessage(message);
  }
  logInteractionUsage(interaction, true);

  setTimeout(async () => {
    winRow.components.forEach((button) => button.setDisabled(true));
    loseRow.components.forEach((button) => button.setDisabled(true));
    try {
      const msg = await interaction.fetchReply();
      if (!msg || !msg.editable) {
        return;
      }

      msg.edit({ embeds: [embed], components: [winRow, loseRow] });
    } catch (error) {
      console.log(
        "Message has already been deleted. Can't change buttons in startBet.ts"
      );
    }
  }, timeLeftInSeconds * 1000);
}
