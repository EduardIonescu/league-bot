import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Events,
  Interaction,
  MessageFlags,
  time,
  TimestampStyles,
} from "discord.js";
import { Bet, UserAdvanced } from "../data/schema.js";
import { loseButtons, NICU_IN_TZAPI, winButtons } from "../lib/constants.js";
import { logInteractionUsage } from "../lib/db/logging.js";
import { addBet, getActiveMatch } from "../lib/db/match.js";
import { getOrAddUserIfAbsent, getUser, updateUser } from "../lib/db/user.js";
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

    const discordId = interaction.user.id;
    const { error: errorUserFirst, user: userFirst } = getOrAddUserIfAbsent(
      discordId,
      interaction.guildId!
    );

    if (errorUserFirst || !userFirst) {
      await interaction.customReply({
        content: errorUserFirst,
        flags: MessageFlags.Ephemeral,
        components: [],
      });
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    if (prefix.includes("all")) {
      const { shouldReturn } = await handleAllInClick(
        interaction,
        userFirst,
        deferHandler
      );
      if (shouldReturn) {
        return;
      }
    }

    // Fetch the user again. This is against clicking `All In` and then betting
    // something else before clicking confirm in the ephemeral message
    const { error: errorUser, user } = getUser(discordId, interaction.guildId!);
    if (errorUser || !user) {
      await interaction.customReply({
        content: errorUser,
        flags: MessageFlags.Ephemeral,
        components: [],
      });
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    const summonerPUUID = interaction.customId.replace(prefix + "-", "");
    if (!summonerPUUID) {
      interaction.reply({
        content: `Player not found`,
        flags: MessageFlags.Ephemeral,
      });
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    const { error, match, bets, messages } = getActiveMatch(summonerPUUID);

    if (error || !match || !messages) {
      interaction.customReply({
        content: "Game is not active",
        flags: MessageFlags.Ephemeral,
        components: [],
      });
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    const win = winCustomIds.includes(prefix) ? 1 : 0;

    let currencyType: Currency;
    let oppositeCurrencyType: Currency;
    if (prefix.includes("tzapi") || prefix.includes("all")) {
      currencyType = "tzapi";
      oppositeCurrencyType = "nicu";
    } else {
      currencyType = "nicu";
      oppositeCurrencyType = "tzapi";
    }

    const { canBet } = canBetOnActiveGame(match.gameStartTime);

    if (!canBet) {
      await interaction.customReply({
        content: "Betting window has closed. Better luck on the next one!",
        flags: MessageFlags.Ephemeral,
        components: [],
      });
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    const button = [...winButtons, ...loseButtons].find(
      (b) => b.customId === prefix
    );

    let betAmount: number;

    if (prefix.includes("all")) {
      betAmount = user.balance.nicu * NICU_IN_TZAPI + user.balance.tzapi;
    } else {
      betAmount = button!.amount;
    }

    const userBets = bets?.filter((bet) => bet.discordId === user.discordId);
    const { winRow, loseRow } = bettingButtons(summonerPUUID);

    if (userBets) {
      const userBetOnOppositeOutcome = userBets.find((bet) => bet.win !== win);

      if (userBetOnOppositeOutcome) {
        await interaction.customReply({
          content: `You fool! You tried to bet ${
            win ? "win" : "loss"
          } when you've already bet on the opposite!`,
          components: [],
          flags: MessageFlags.Ephemeral,
        });
        logInteractionUsage(interaction);
        deferHandler.cancel();

        return;
      }
    }

    const balance = user.balance[currencyType];

    if (betAmount > balance) {
      if (currencyType === "nicu") {
        const totalTzapiInNicu = Math.floor(user.balance.tzapi / NICU_IN_TZAPI);
        const totalCurrencyInNicu = user.balance.nicu + totalTzapiInNicu;

        if (totalCurrencyInNicu < betAmount) {
          await interaction.customReply({
            content: `You don't have enough currency to bet ${betAmount}. You currently have ${balance} ${toTitleCase(
              currencyType
            )}.`,
            flags: MessageFlags.Ephemeral,
            components: [],
          });
          logInteractionUsage(interaction);
          deferHandler.cancel();

          return;
        }

        const nicuInTzapiNeeded =
          (betAmount - user.balance.nicu) * NICU_IN_TZAPI;
        const tzapi = user.balance.tzapi - nicuInTzapiNeeded;

        user.balance = { nicu: 0, tzapi };

        // currencyType ===  "tzapi"
      } else {
        const totalNicuInTzapi = user.balance.nicu * NICU_IN_TZAPI;
        const totalCurrencyInTzapi = user.balance.tzapi + totalNicuInTzapi;

        if (totalCurrencyInTzapi < betAmount) {
          await interaction.customReply({
            content: `You don't have enough currency to bet ${betAmount}. You currently have ${balance} ${toTitleCase(
              currencyType
            )}.`,
            flags: MessageFlags.Ephemeral,
            components: [],
          });
          logInteractionUsage(interaction);
          deferHandler.cancel();

          return;
        }

        const nicuNeeded = Math.ceil(
          (betAmount - user.balance.tzapi) / NICU_IN_TZAPI
        );
        const nicu = user.balance.nicu - nicuNeeded;
        const tzapi =
          nicuNeeded * NICU_IN_TZAPI + user.balance.tzapi - betAmount;

        user.balance = { nicu, tzapi };
      }
    } else {
      user.balance[currencyType] -= betAmount;
    }

    user.timesBet += 1;

    const bet: Bet = {
      discordId,
      guildId: interaction.guildId!,
      win,
      gameId: match.gameId,
      [currencyType]: betAmount,
      [oppositeCurrencyType]: 0,
      timestamp: new Date(),
    };
    addBet(bet);

    const { error: updateError } = updateUser(user);

    if (updateError) {
      await interaction.reply({
        content: `${updateError}`,
        components: [],
        flags: MessageFlags.Ephemeral,
      });
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    const totalBets = [...(bets ?? []), bet];
    const { totalBetWin, totalBetLose } = getTotalBets(totalBets);

    const totalNicuWinMsg = totalBetWin.nicu ? `${totalBetWin.nicu} Nicu ` : "";
    const totalNicuLoseMsg = totalBetLose.nicu
      ? `${totalBetLose.nicu} Nicu `
      : "";

    const embedObject = interaction.message.embeds[0];
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

    await interaction.customReply({
      content: `You've bet ${betAmount} ${toTitleCase(currencyType)} on ${
        win ? "win" : "lose"!
      }`,
      flags: MessageFlags.Ephemeral,
      components: [],
    });

    if (prefix.includes("all")) {
      await interaction.followUp({
        content: `**WHAT A MADLAD!** <@${discordId}> has bet ${betAmount} ${toTitleCase(
          currencyType
        )} on ${win ? "win" : "lose"!}`,
      });
    }

    logInteractionUsage(interaction, true);
  },
};

async function handleAllInClick(
  interaction: ButtonInteraction,
  user: UserAdvanced,
  deferHandler: { cancel: () => void }
) {
  if (user.balance.nicu === 0 && user.balance.tzapi === 0) {
    await interaction.reply({
      content: `You can't bet if you're broke...`,
      flags: MessageFlags.Ephemeral,
    });

    logInteractionUsage(interaction);
    deferHandler.cancel();

    return { shouldReturn: true };
  }
  const buttonAccept = new ButtonBuilder()
    .setCustomId("accept")
    .setLabel("Confirm")
    .setStyle(ButtonStyle.Success);

  const buttonCancel = new ButtonBuilder()
    .setCustomId("cancel")
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
    buttonCancel,
    buttonAccept
  );

  const timeString = time(
    new Date(new Date().getTime() + 16_000),
    TimestampStyles.RelativeTime
  );
  const response = await interaction.reply({
    content: `**ALL IN?**  \nWindow closing ${timeString}.`,
    withResponse: true,
    flags: MessageFlags.Ephemeral,
    components: [row],
  });

  try {
    const filter = (i: Interaction) => i.user.id === interaction.user.id;
    const confirmation =
      await response.resource?.message?.awaitMessageComponent({
        filter,
        time: 15_000,
      });

    if (!confirmation || confirmation.customId === "cancel") {
      await interaction.editReply({ content: "Canceled.", components: [] });
      logInteractionUsage(interaction);

      deferHandler.cancel();
      return { shouldReturn: true };
    }
  } catch (error) {
    await interaction.editReply({ content: "Timed out.", components: [] });
    logInteractionUsage(interaction);

    deferHandler.cancel();

    return { shouldReturn: true };
  }

  return { shouldReturn: false };
}
