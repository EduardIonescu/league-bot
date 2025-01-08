import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  MessageFlags,
  RestOrArray,
  SlashCommandBuilder,
  TextBasedChannel,
} from "discord.js";
import * as fs from "node:fs";
import {
  CHECK_GAME_FINISHED_INTERVAL,
  loseButtons,
  winButtons,
} from "../../constants.js";
import {
  Account,
  Bet,
  calculateCurrencyOutcome,
  canBetOnActiveGame,
  getActiveGame,
  getBettingUser,
  getFinishedMatch,
  getSpectatorData,
  handleLoserBetResult,
  handleMatchOutcome,
  handleWinnerBetResult,
  Match,
  moveFinishedGame,
  updateActiveGame,
  updateUser,
} from "../../utils.js";

let choices: { name: string; value: string }[] = [];
const accounts: Account[] = [];

const rootPath = import.meta.url.split("dist/")[0];
const accountsFolder = new URL("accounts/", rootPath);
const accountFiles = fs.readdirSync(accountsFolder);
for (const file of accountFiles) {
  const filePath = new URL(file, accountsFolder);
  const account = JSON.parse(fs.readFileSync(filePath, "utf8"));
  accounts.push(account);
  choices.push({
    name: `${account.gameName}#${account.tagLine}`,
    value: `${account.summonerPUUID}`,
  });
}

let intervalId: NodeJS.Timeout | null;
let counter = 0;

const bet = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet on League matches outcomes")
    .addStringOption((option) =>
      option
        .setName("account")
        .setDescription("Account")
        .setRequired(true)
        .addChoices(...choices)
    ),
  async execute(interaction: any) {
    await interaction.deferReply();

    const channel = interaction.channel as TextBasedChannel;
    if (!channel.isSendable()) {
      return;
    }

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    const summonerPUUID = interaction.options.getString("account");
    const account = accounts.find((acc) => acc.summonerPUUID === summonerPUUID);

    if (account?.region) {
      const player = account.gameName + "#" + account.tagLine;
      let { game, error } = await getActiveGame(summonerPUUID);
      if (error || !game) {
        try {
          const spectatorData = await getSpectatorData(
            summonerPUUID,
            account.region
          );
          if (!spectatorData || spectatorData?.status?.status_code) {
            await interaction.editReply(`${player} is not in game`);
            return;
          }
          game = {
            gameId: spectatorData.gameId,
            player,
            inGameTime: spectatorData.gameLength,
            summonerId: summonerPUUID,
            gameStartTime: spectatorData.gameStartTime,
            bets: [],
          };
          await updateActiveGame(game);
        } catch (err) {
          await interaction.editReply(`${player} is not in game`);
          return;
        }
      }

      intervalId = setInterval(async () => {
        counter += CHECK_GAME_FINISHED_INTERVAL;
        if (counter > 10 * 60 * 60 * 60 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;

          channel.send(
            `The game of ${game.player} with the id: ${game.gameId} is not valid. Everyone gets their Tzapi back.`
          );
          return;
        }

        const gameIdWithRegion = `${account.region.toUpperCase()}_${
          game.gameId
        }`;
        const { active, match } = await getFinishedMatch(gameIdWithRegion);
        if (!active && match?.info.endOfGameResult) {
          const participant = match.info.participants.find(
            (p) => p.puuid === summonerPUUID
          );
          if (participant) {
            const betByUser = await handleMatchOutcome(game, participant.win);
            const { winners, losers } = calculateCurrencyOutcome(betByUser);
            const updatedWinners = await handleWinnerBetResult(winners);
            const upodatedLosers = await handleLoserBetResult(losers);

            const fieldsWinners: RestOrArray<APIEmbedField> = [
              { name: "Winners :star_struck:", value: "Nice job bois" },
              ...updatedWinners.map((winner) => ({
                name: `\u200b`,
                value: `<@${winner.updatedUser.discordId}> won ${winner.winnings} Tzapi!`,
              })),
            ];
            const fieldsLosers: RestOrArray<APIEmbedField> = [
              {
                name: "Losers :person_in_manual_wheelchair:",
                value: "Hahahaha git gut",
              },
              ...upodatedLosers.map((loser) => ({
                name: `\u200b`,
                value: `<@${loser.updatedUser.discordId}> lost ${loser.loss} Tzapi!`,
              })),
            ];
            const embedOutcome = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle("League Bets :coin:")
              .setDescription(`The bet on \`${player}\`'s match has resolved.`)
              .addFields(
                { name: "Total Bets Placed", value: `${game.bets.length}` },
                { name: "\u200b", value: "\u200b" },
                ...fieldsWinners,
                { name: "\u200b", value: "\u200b" },
                ...fieldsLosers,
                { name: "\u200b", value: "\u200b" }
              )
              .setTimestamp();
            channel.send({ embeds: [embedOutcome] });

            const { error } = await moveFinishedGame(game, participant.win);
            if (error) {
              console.log("Error moving finished game", error);
            }
            clearInterval(intervalId!);
            intervalId = null;
            return;
          }
        }
      }, CHECK_GAME_FINISHED_INTERVAL * 1_000);

      const totalBetWin = game.bets.reduce(
        (acc, cur) => acc + (cur.win ? cur.amount : 0),
        0
      );
      const totalBetLose = game.bets.reduce(
        (acc, cur) => acc + (cur.win ? 0 : cur.amount),
        0
      );

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("League Bets :coin:")
        .setDescription(`We betting on \`${player}\`'s match.`)
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

      const winButtonsBuilders = winButtons.map((button) =>
        new ButtonBuilder()
          .setLabel(button.label)
          .setCustomId(button.customId)
          .setStyle(ButtonStyle.Primary)
      );
      const loseButtonsBuilders = loseButtons.map((button) =>
        new ButtonBuilder()
          .setLabel(button.label)
          .setCustomId(button.customId)
          .setStyle(ButtonStyle.Danger)
      );
      const winRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...winButtonsBuilders
      );
      const loseRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...loseButtonsBuilders
      );

      const response: Message = await interaction.editReply({
        embeds: [embed],
        components: [winRow, loseRow],
      });

      createCollector(response, interaction, game, embed, winRow, loseRow);
    } else {
      interaction.editReply(`idk some shit happened`);
    }
  },
};

async function createCollector(
  message: Message,
  interaction: any,
  game: Match,
  embed: EmbedBuilder,
  winRow: ActionRowBuilder<ButtonBuilder>,
  loseRow: ActionRowBuilder<ButtonBuilder>
) {
  const collectorFilter = (i: any) => i.user.id === interaction.user.id;

  const collector = message.createMessageComponentCollector({
    filter: collectorFilter,
    time: 15 * 60_000,
  });
  collector.on("collect", async (buttonInteraction) => {
    const winCustomIds = winButtons.map((b) => b.customId);
    const loseCustomIds = loseButtons.map((b) => b.customId);
    if (
      winCustomIds.includes(buttonInteraction.customId) ||
      loseCustomIds.includes(buttonInteraction.customId)
    ) {
      const win = winCustomIds.includes(buttonInteraction.customId);
      const discordId = buttonInteraction.user.id;

      // Do something else on modal TODO:
      if (
        buttonInteraction.customId === "win-custom" ||
        buttonInteraction.customId === "lose-custom"
      ) {
        return;
      }

      const button = [...winButtons, ...loseButtons].find(
        (b) => b.customId === buttonInteraction.customId
      );
      const betAmount = button!.amount!;
      const { error, user: bettingUser } = await getBettingUser(discordId);

      if (error || !bettingUser) {
        buttonInteraction.reply({
          content: error,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const currency = bettingUser.currency;

      if (betAmount > currency) {
        await buttonInteraction.reply({
          content: `You don't have enough currency to bet ${betAmount}. You currently have ${currency}.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      } else {
        const bettingUserBets = game.bets.filter(
          (bet) => bet.discordId === bettingUser.discordId
        );
        if (bettingUserBets) {
          const userBetOnOppositeOutcome = bettingUserBets.find(
            (bet) => bet.win !== win
          );
          if (userBetOnOppositeOutcome) {
            await buttonInteraction.reply({
              content: `You fool! You tried to bet ${
                win ? "win" : "loss"
              } when you've already bet on the opposite!`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
        }
        bettingUser.currency -= betAmount;
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

        const totalBetWin = game.bets.reduce(
          (acc, cur) => acc + (cur.win ? cur.amount : 0),
          0
        );
        const totalBetLose = game.bets.reduce(
          (acc, cur) => acc + (cur.win ? 0 : cur.amount),
          0
        );

        embed.setFields(
          { name: "\u200b", value: "\u200b" },
          { name: "Win", value: `${totalBetWin} Tzapi`, inline: true },
          { name: "Lose", value: `${totalBetLose} Tzapi`, inline: true },
          { name: "Total Bets Placed", value: `${game.bets.length}` },
          { name: "\u200b", value: "\u200b" }
        );
        await buttonInteraction.update({
          embeds: [embed],
          components: [winRow, loseRow],
        });
        await buttonInteraction.followUp({
          content: `You've bet ${betAmount} Tzapi on ${win ? "win" : "lose"!}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });

  collector.on("end", () => {
    winRow.components.forEach((button) => button.setDisabled(true));
    loseRow.components.forEach((button) => button.setDisabled(true));
    message.edit({ components: [winRow, loseRow] });
  });
}

export default bet;
