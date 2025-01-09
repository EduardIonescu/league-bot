import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  MessageFlags,
  SlashCommandBuilder,
  TextBasedChannel,
} from "discord.js";
import * as fs from "node:fs";
import { loseButtons, winButtons } from "../../constants.js";
import {
  Account,
  Bet,
  canBetOnActiveGame,
  getActiveGame,
  getBettingUser,
  getSpectatorData,
  Match,
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
            region: account.region,
            player,
            inGameTime: spectatorData.gameLength,
            summonerId: summonerPUUID,
            gameStartTime: spectatorData.gameStartTime,
            channelId: channel.id,
            bets: [],
          };

          const canBetOnGame = canBetOnActiveGame(game.gameStartTime);
          if (!canBetOnGame) {
            interaction.editReply({
              content:
                "Betting window has closed. Better luck on the next one!",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          await updateActiveGame(game);
        } catch (err) {
          await interaction.editReply(`${player} is not in game`);
          return;
        }
      }

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
  _interaction: any,
  game: Match,
  embed: EmbedBuilder,
  winRow: ActionRowBuilder<ButtonBuilder>,
  loseRow: ActionRowBuilder<ButtonBuilder>
) {
  const collectorFilter = (_: any) => true;

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
      const betAmount = button!.amount;
      const { error, user: bettingUser } = await getBettingUser(discordId);

      if (error || !bettingUser) {
        buttonInteraction.followUp({
          content: error,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const currency = bettingUser.currency;

      if (betAmount > currency) {
        await buttonInteraction.followUp({
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
            await buttonInteraction.followUp({
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
