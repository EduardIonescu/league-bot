import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  CommandInteraction,
  EmbedBuilder,
  Message,
  MessageFlags,
  TextBasedChannel,
} from "discord.js";
import { Bet } from "../../data/schema.js";
import { loseButtons, NICU_IN_TZAPI, winButtons } from "../constants.js";
import {
  addActiveMatch,
  addBet,
  addMessage,
  getActiveMatch,
} from "../db/match.js";
import { getUser, updateUser } from "../db/user.js";
import { Currency } from "../types/common.js";
import { Account } from "../types/riot.js";
import { toTitleCase } from "./common.js";
import {
  bettingButtons,
  canBetOnActiveGame,
  formatPlayerName,
  getTotalBets,
} from "./game.js";
import { fetchSpectatorData } from "./riot.js";

export async function placeBet(
  interaction: CommandInteraction | ButtonInteraction,
  account?: Account
) {
  await interaction.deferReply();

  if (!account) {
    interaction.editReply("Account not found. Try saving it first with `/add`");
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
        return;
      }

      if (
        !(spectatorData.gameQueueConfigId === 420) &&
        !(spectatorData.gameQueueConfigId === 440)
      ) {
        interaction.editReply(
          `You can't bet on ${spectatorData.gameMode} games. You can only bet on Ranked Solo/Duo and Ranked Flex games.`
        );
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

      const canBetOnGame = canBetOnActiveGame(match.gameStartTime);

      if (!canBetOnGame) {
        interaction.editReply({
          content: "Betting window has closed. Better luck on the next one!",
          // flags: MessageFlags.Ephemeral,
        });
        return;
      }

      addActiveMatch(match);
    } catch (err) {
      interaction.editReply(`${player} is not in game`);
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

  const canBetOnGame = canBetOnActiveGame(match.gameStartTime);
  if (!canBetOnGame) {
    await interaction.editReply({
      embeds: [embed],
      components: [],
    });
    interaction.followUp({
      content: "Betting window has closed. Better luck on the next one!",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { winRow, loseRow } = bettingButtons();

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

  await createBetCollector(response, summonerPUUID, embed, winRow, loseRow);
}

export async function createBetCollector(
  message: Message,
  summonerPUUID: string,
  embed: EmbedBuilder,
  winRow: ActionRowBuilder<ButtonBuilder>,
  loseRow: ActionRowBuilder<ButtonBuilder>
) {
  const collectorFilter = (_: any) => true;

  const collector = message.createMessageComponentCollector({
    filter: collectorFilter,
    time: 7 * 60_000,
  });

  collector.on("collect", async (buttonInteraction) => {
    const winCustomIds = winButtons.map((b) => b.customId);
    const loseCustomIds = loseButtons.map((b) => b.customId);

    if (
      !winCustomIds.includes(buttonInteraction.customId) &&
      !loseCustomIds.includes(buttonInteraction.customId)
    ) {
      return;
    }

    const { error, match, bets, messages } = getActiveMatch(summonerPUUID);

    if (error || !match || !messages) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      await buttonInteraction.followUp({
        content: "Game is not active",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const win = winCustomIds.includes(buttonInteraction.customId) ? 1 : 0;
    const discordId = buttonInteraction.user.id;
    const currencyType: Currency = buttonInteraction.customId.includes("nicu")
      ? "nicu"
      : "tzapi";
    const oppositeCurrencyType: Currency = buttonInteraction.customId.includes(
      "nicu"
    )
      ? "tzapi"
      : "nicu";

    const canBetOnGame = canBetOnActiveGame(match.gameStartTime);
    if (!canBetOnGame) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      await buttonInteraction.followUp({
        content: "Betting window has closed. Better luck on the next one!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const button = [...winButtons, ...loseButtons].find(
      (b) => b.customId === buttonInteraction.customId
    );
    const betAmount = button!.amount;

    const { error: errorUser, user } = getUser(discordId);

    if (errorUser || !user) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      await buttonInteraction.followUp({
        content: errorUser,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userBets = bets?.filter((bet) => bet.discordId === user.discordId);

    if (userBets) {
      const userBetOnOppositeOutcome = userBets.find((bet) => bet.win !== win);

      if (userBetOnOppositeOutcome) {
        await buttonInteraction.update({
          embeds: [embed],
          components: [winRow, loseRow],
        });
        await buttonInteraction.followUp({
          content: `You fool! You tried to bet ${
            win ? "win" : "loss"
          } when you've already bet on the opposite!`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    const balance = user.balance[currencyType];

    if (betAmount > balance) {
      const totalTzapiInNicu = Math.floor(user.balance.tzapi / NICU_IN_TZAPI);
      const totalCurrencyInNicu = user.balance.nicu + totalTzapiInNicu;

      if (currencyType !== "nicu" || totalCurrencyInNicu < betAmount) {
        await buttonInteraction.update({
          embeds: [embed],
          components: [winRow, loseRow],
        });
        await buttonInteraction.followUp({
          content: `You don't have enough currency to bet ${betAmount}. You currently have ${balance} ${toTitleCase(
            currencyType
          )}.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const nicuInTzapiNeeded = (betAmount - user.balance.nicu) * NICU_IN_TZAPI;
      const tzapi = user.balance.tzapi - nicuInTzapiNeeded;

      user.balance = { nicu: 0, tzapi };
    } else {
      user.balance[currencyType] -= betAmount;
    }

    user.timesBet += 1;

    const betDb: Bet = {
      discordId,
      win,
      gameId: match.gameId,
      [currencyType]: betAmount,
      [oppositeCurrencyType]: 0,
    };
    addBet(betDb);

    const { error: updateError } = updateUser(user);

    if (updateError) {
      await buttonInteraction.update({
        content: `${updateError}`,
        components: [],
      });
      return;
    }

    const totalBets = [...(bets ?? []), betDb];
    const { totalBetWin, totalBetLose } = getTotalBets(totalBets);

    const totalNicuWinMsg = totalBetWin.nicu ? `${totalBetWin.nicu} Nicu ` : "";
    const totalNicuLoseMsg = totalBetLose.nicu
      ? `${totalBetLose.nicu} Nicu `
      : "";
    embed.setFields(
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
      { name: "Total Bets Placed", value: `${totalBets.length}` },
      { name: "\u200b", value: "\u200b" }
    );
    console.log(
      "bet made!",
      buttonInteraction.createdAt,
      ". By: ",
      buttonInteraction.user.username
    );

    await Promise.all(
      messages.map(async (msg) => {
        try {
          const channel = await buttonInteraction.client.channels.fetch(
            msg.channelId
          );
          if (!channel || !channel.isSendable()) {
            return;
          }

          const fetchedMessage = await channel.messages.fetch(msg.messageId);
          if (fetchedMessage) {
            await fetchedMessage.edit({
              embeds: [embed],
              components: [winRow, loseRow],
            });
          }
        } catch (err) {
          console.log(err);
          return;
        }
      })
    );

    await buttonInteraction.update({
      embeds: [embed],
      components: [winRow, loseRow],
    });
    await buttonInteraction.followUp({
      content: `You've bet ${betAmount} ${toTitleCase(currencyType)} on ${
        win ? "win" : "lose"!
      }`,
      flags: MessageFlags.Ephemeral,
    });
  });

  collector.on("end", async () => {
    winRow.components.forEach((button) => button.setDisabled(true));
    loseRow.components.forEach((button) => button.setDisabled(true));
    try {
      if (message && message.editable) {
        await message.edit({ components: [winRow, loseRow] });
      }
    } catch (err) {
      console.log("Error in interaction.ts ", err);
    }
  });
}
