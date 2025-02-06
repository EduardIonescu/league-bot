import {
  ButtonInteraction,
  EmbedBuilder,
  Events,
  MessageFlags,
} from "discord.js";
import { Bet } from "../data/schema.js";
import { loseButtons, NICU_IN_TZAPI, winButtons } from "../lib/constants.js";
import { addBet, getActiveMatch } from "../lib/db/match.js";
import { getUser, updateUser } from "../lib/db/user.js";
import { Currency } from "../lib/types/common.js";
import { toTitleCase } from "../lib/utils/common.js";
import { handleDefer } from "../lib/utils/customReply.js";
import {
  bettingButtons,
  canBetOnActiveGame,
  getTotalBets,
} from "../lib/utils/game.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    const winCustomIds = winButtons.map((b) => b.customId);
    const loseCustomIds = loseButtons.map((b) => b.customId);

    let prefix: string | undefined;
    [...winCustomIds, ...loseCustomIds].forEach((customId) => {
      if (interaction?.customId?.startsWith(customId)) {
        prefix = customId;
      }
    });

    if (!prefix) {
      return;
    }

    const deferHandler = handleDefer(interaction);
    deferHandler.start();

    const summonerPUUID = interaction.customId.replace(prefix + "-", "");
    if (!summonerPUUID) {
      interaction.customReply(`Player not found`);
      deferHandler.cancel();

      return;
    }

    const { error, match, bets, messages } = getActiveMatch(summonerPUUID);

    if (error || !match || !messages) {
      interaction.customReply({
        content: "Game is not active",
      });
      deferHandler.cancel();

      return;
    }

    const win = winCustomIds.includes(prefix) ? 1 : 0;
    const discordId = interaction.user.id;
    const currencyType: Currency = prefix.includes("nicu") ? "nicu" : "tzapi";
    const oppositeCurrencyType: Currency = prefix.includes("nicu")
      ? "tzapi"
      : "nicu";

    const canBetOnGame = canBetOnActiveGame(match.gameStartTime);
    const embedObject = interaction.message.embeds[0];

    if (!canBetOnGame) {
      await interaction.update({
        embeds: [embedObject],
        components: [],
      });
      await interaction.followUp({
        content: "Betting window has closed. Better luck on the next one!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const button = [...winButtons, ...loseButtons].find(
      (b) => b.customId === prefix
    );
    const betAmount = button!.amount;

    const { error: errorUser, user } = getUser(discordId);

    if (errorUser || !user) {
      await interaction.update({
        embeds: [embedObject],
        components: [],
      });
      await interaction.followUp({
        content: errorUser,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userBets = bets?.filter((bet) => bet.discordId === user.discordId);
    const { winRow, loseRow } = bettingButtons(summonerPUUID);

    if (userBets) {
      const userBetOnOppositeOutcome = userBets.find((bet) => bet.win !== win);

      if (userBetOnOppositeOutcome) {
        await interaction.update({
          embeds: [embedObject],
          components: [winRow, loseRow],
        });
        await interaction.followUp({
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
        await interaction.update({
          embeds: [embedObject],
          components: [winRow, loseRow],
        });
        await interaction.followUp({
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

    const bet: Bet = {
      discordId,
      win,
      gameId: match.gameId,
      [currencyType]: betAmount,
      [oppositeCurrencyType]: 0,
      timestamp: new Date(),
    };
    addBet(bet);

    const { error: updateError } = updateUser(user);

    if (updateError) {
      await interaction.update({
        content: `${updateError}`,
        components: [],
      });
      return;
    }

    const totalBets = [...(bets ?? []), bet];
    const { totalBetWin, totalBetLose } = getTotalBets(totalBets);

    const totalNicuWinMsg = totalBetWin.nicu ? `${totalBetWin.nicu} Nicu ` : "";
    const totalNicuLoseMsg = totalBetLose.nicu
      ? `${totalBetLose.nicu} Nicu `
      : "";

    const embed = EmbedBuilder.from(embedObject);
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
      interaction.createdAt,
      ". By: ",
      interaction.user.username
    );

    await Promise.all(
      messages.map(async (msg) => {
        try {
          const channel = await interaction.client.channels.fetch(
            msg.channelId
          );
          if (!channel || !channel.isSendable()) {
            return;
          }
          const fetchedMessage = await channel.messages.fetch(msg.messageId);
          if (fetchedMessage && fetchedMessage.editable) {
            await fetchedMessage.edit({
              embeds: [embed],
              components: [winRow, loseRow],
            });
          }
        } catch (err) {
          console.log("msg", msg);
          console.log(err);
          return;
        }
      })
    );

    await interaction.update({
      embeds: [embed],
      components: [winRow, loseRow],
    });
    await interaction.followUp({
      content: `You've bet ${betAmount} ${toTitleCase(currencyType)} on ${
        win ? "win" : "lose"!
      }`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
