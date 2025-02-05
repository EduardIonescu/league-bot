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
import { loseButtons, NICU_IN_TZAPI, winButtons } from "../constants.js";
import { getUser, updateUser } from "../db/user.js";
import { Bet, Currency } from "../types/common.js";
import { Account } from "../types/riot.js";
import { toTitleCase } from "./common.js";
import {
  bettingButtons,
  canBetOnActiveGame,
  formatPlayerName,
  getActiveGame,
  getTotalBets,
  updateActiveGame,
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
  let { game, error } = await getActiveGame(summonerPUUID);

  const channel = interaction.channel as TextBasedChannel;

  if (error || !game) {
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

      game = {
        gameId: spectatorData.gameId,
        region: account.region,
        gameQueueConfigId: spectatorData.gameQueueConfigId,
        gameMode: spectatorData.gameMode,
        gameType: spectatorData.gameType,
        player,
        inGameTime: spectatorData.gameLength,
        summonerId: summonerPUUID,
        gameStartTime: spectatorData.gameStartTime,
        sentIn: [{ channelId: channel.id, messageIds: [] }],
        againstBot: true,
        bets: [],
      };
      console.log("game", game);
      const canBetOnGame = canBetOnActiveGame(game.gameStartTime);
      if (!canBetOnGame) {
        interaction.editReply({
          content: "Betting window has closed. Better luck on the next one!",
          // flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await updateActiveGame(game);
    } catch (err) {
      interaction.editReply(`${player} is not in game`);
      return;
    }
  }

  const { totalBetWin, totalBetLose } = getTotalBets(game.bets);

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
      { name: "Total Bets Placed", value: `${game.bets.length}` },
      { name: "\u200b", value: "\u200b" }
    )
    .setTimestamp();

  const canBetOnGame = canBetOnActiveGame(game.gameStartTime);
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

  const channelInGame = game.sentIn.find((s) => s.channelId === channel.id);
  if (!channelInGame) {
    game.sentIn.push({ channelId: channel.id, messageIds: [response.id] });
    await updateActiveGame(game);
  } else {
    const isMessageIdSaved = channelInGame.messageIds.find(
      (messageId) => messageId === response.id
    );
    if (!isMessageIdSaved) {
      channelInGame.messageIds.push(response.id);
      await updateActiveGame(game);
    }
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

    const { error: getActiveGameError, game } = await getActiveGame(
      summonerPUUID
    );

    if (getActiveGameError || !game) {
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

    const win = winCustomIds.includes(buttonInteraction.customId);
    const discordId = buttonInteraction.user.id;
    const currencyType: Currency = buttonInteraction.customId.includes("nicu")
      ? "nicu"
      : "tzapi";
    const oppositeCurrencyType: Currency = buttonInteraction.customId.includes(
      "nicu"
    )
      ? "tzapi"
      : "nicu";

    const canBetOnGame = canBetOnActiveGame(game.gameStartTime);
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

    const { error, user } = getUser(discordId);

    if (error || !user) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      await buttonInteraction.followUp({
        content: error,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userBets = game.bets.filter(
      (bet) => bet.discordId === user.discordId
    );

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

    const gameBet: Bet = {
      discordId,
      //@ts-ignore
      amount: { [currencyType]: betAmount, [oppositeCurrencyType]: 0 },
      win,
      timestamp: new Date(),
      inGameTime: game.inGameTime,
    };
    game.bets.push(gameBet);

    const { error: activeGameError } = await updateActiveGame(game);

    const { error: updateError } = updateUser(user);

    if (activeGameError || updateError) {
      await buttonInteraction.update({
        content: `${activeGameError || updateError}`,
        components: [],
      });
      return;
    }

    const { totalBetWin, totalBetLose } = getTotalBets(game.bets);

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
      { name: "Total Bets Placed", value: `${game.bets.length}` },
      { name: "\u200b", value: "\u200b" }
    );
    console.log("bet made!", buttonInteraction.createdAt);

    // Update all bet messages
    for (const sentIn of game.sentIn) {
      const channel = await buttonInteraction.client.channels.fetch(
        sentIn.channelId
      );
      if (!channel || !channel.isSendable()) {
        await buttonInteraction.update({
          content: `Error`,
          components: [],
        });
        return;
      }
      for (const messageId of sentIn.messageIds) {
        try {
          const message = await channel.messages.fetch(messageId);

          if (message) {
            await message.edit({
              embeds: [embed],
              components: [winRow, loseRow],
            });
          }
        } catch (err) {
          console.log(err);
        }
      }
    }

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
