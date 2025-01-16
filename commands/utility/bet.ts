import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  Message,
  MessageFlags,
  SlashCommandBuilder,
  TextBasedChannel,
} from "discord.js";
import { loseButtons, winButtons } from "../../constants.js";
import {
  Bet,
  bettingButtons,
  canBetOnActiveGame,
  formatChoices,
  formatPlayerName,
  getAccountsSync,
  getActiveGame,
  getBettingUser,
  getSpectatorData,
  getTotalBets,
  Match,
  updateActiveGame,
  updateUser,
} from "../../utils.js";

const accounts = getAccountsSync();
const choices = formatChoices(accounts);

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet on League matches' outcomes vs the bot.")
    .addStringOption((option) =>
      option
        .setName("account")
        .setDescription("Account")
        .setRequired(true)
        .addChoices(...choices)
    ),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const channel = interaction.channel as TextBasedChannel;

    const summonerPUUID = (
      interaction.options as CommandInteractionOptionResolver
    ).getString("account");
    console.log("summonerPUUID", summonerPUUID);
    const account = accounts.find((acc) => acc.summonerPUUID === summonerPUUID);

    if (!summonerPUUID || !account) {
      await interaction.editReply(
        "Account not found. Try saving it first with `/add`"
      );
      return;
    }
    console.log("account", account);
    const player = formatPlayerName(account.gameName, account.tagLine);
    let { game, error } = await getActiveGame(summonerPUUID);

    if (error || !game) {
      try {
        const spectatorData = await getSpectatorData(
          summonerPUUID,
          account.region
        );

        if (
          !spectatorData ||
          typeof spectatorData === "string" ||
          "status" in spectatorData
        ) {
          await interaction.editReply(`${player} is not in game`);
          return;
        }

        if (
          !(spectatorData.gameQueueConfigId === 420) &&
          !(spectatorData.gameQueueConfigId === 440)
        ) {
          await interaction.editReply(
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
          channelId: channel.id,
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
        await interaction.editReply(`${player} is not in game`);
        return;
      }
    }

    const { totalBetWin, totalBetLose } = getTotalBets(game.bets);

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("League Bets :coin:")
      .setDescription(
        `We betting on \`${player}\`'s match against the COMPUTER.`
      )
      .addFields(
        { name: "\u200b", value: "\u200b" },
        { name: "Win", value: `${totalBetWin} Tzapi`, inline: true },
        { name: "Lose", value: `${totalBetLose} Tzapi`, inline: true },
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

    createCollector(response, interaction, game, embed, winRow, loseRow);
  },
};

async function createCollector(
  message: Message,
  _interaction: CommandInteraction,
  game: Match,
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

    const win = winCustomIds.includes(buttonInteraction.customId);
    const discordId = buttonInteraction.user.id;

    const canBetOnGame = canBetOnActiveGame(game.gameStartTime);
    if (!canBetOnGame) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      buttonInteraction.followUp({
        content: "Betting window has closed. Better luck on the next one!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const button = [...winButtons, ...loseButtons].find(
      (b) => b.customId === buttonInteraction.customId
    );
    const betAmount = button!.amount;
    const { error, user: bettingUser } = await getBettingUser(discordId);

    if (error || !bettingUser) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      buttonInteraction.followUp({
        content: error,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const currency = bettingUser.currency;

    if (betAmount > currency.tzapi) {
      await buttonInteraction.update({
        embeds: [embed],
        components: [],
      });
      await buttonInteraction.followUp({
        content: `You don't have enough currency to bet ${betAmount}. You currently have ${currency}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const bettingUserBets = game.bets.filter(
      (bet) => bet.discordId === bettingUser.discordId
    );
    if (bettingUserBets) {
      const userBetOnOppositeOutcome = bettingUserBets.find(
        (bet) => bet.win !== win
      );
      if (userBetOnOppositeOutcome) {
        await buttonInteraction.update({
          embeds: [embed],
          components: [],
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

    bettingUser.currency.tzapi -= betAmount;
    bettingUser.timestamp = new Date();
    bettingUser.data.timesBet += 1;

    const gameBet: Bet = {
      discordId,
      amount: betAmount,
      win,
      timestamp: new Date(),
      inGameTime: game.inGameTime,
    };
    game.bets.push(gameBet);

    const { error: activeGameError } = await updateActiveGame(game);
    const { error: userError } = await updateUser(bettingUser!);

    if (activeGameError || userError) {
      await buttonInteraction.update({
        content: `${activeGameError || userError}`,
        components: [],
      });
      return;
    }

    const { totalBetWin, totalBetLose } = getTotalBets(game.bets);

    embed.setFields(
      { name: "\u200b", value: "\u200b" },
      { name: "Win", value: `${totalBetWin} Tzapi`, inline: true },
      { name: "Lose", value: `${totalBetLose} Tzapi`, inline: true },
      { name: "Total Bets Placed", value: `${game.bets.length}` },
      { name: "\u200b", value: "\u200b" }
    );
    console.log("bet made!", buttonInteraction.createdAt);
    await buttonInteraction.update({
      embeds: [embed],
      components: [winRow, loseRow],
    });
    await buttonInteraction.followUp({
      content: `You've bet ${betAmount} Tzapi on ${win ? "win" : "lose"!}`,
      flags: MessageFlags.Ephemeral,
    });
  });

  collector.on("end", () => {
    winRow.components.forEach((button) => button.setDisabled(true));
    loseRow.components.forEach((button) => button.setDisabled(true));
    message.edit({ components: [winRow, loseRow] });
  });
}
