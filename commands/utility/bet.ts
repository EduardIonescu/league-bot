import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import * as fs from "node:fs";
import { loseButtons, winButtons } from "../../constants.js";
import {
  Account,
  Bet,
  getActiveGame,
  getBettingUser,
  getSpectatorData,
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
    const summonerPUUID = interaction.options.getString("account");
    const account = accounts.find((acc) => acc.summonerPUUID === summonerPUUID);

    if (account?.region) {
      const player = account.gameName + "#" + account.tagLine;
      let { game, error } = await getActiveGame(summonerPUUID);
      console.log("game", game);
      if (error || !game) {
        try {
          const spectatorData = await getSpectatorData(
            summonerPUUID,
            account.region
          );
          console.log("spectatorData", spectatorData);
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
      console.log("game", game);
      console.log(
        "time now - game.gameStartTime",
        (Date.now() - game.gameStartTime) / 1_000
      );
      console.log("game.gameStartTime", game.gameStartTime);
      console.log("Date.now()", Date.now());
      console.log(new Date());

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("League Bets")
        .setAuthor({ name: "Ed" })
        .setDescription(`We betting on \`${player}\`'s match`)
        .addFields(
          { name: "\u200b", value: "\u200b" },
          { name: "Win", value: "15 Tzapi", inline: true },
          { name: "Lose", value: "20 Tzapi", inline: true },

          { name: "Total Bets Placed", value: "10" },
          { name: "\u200b", value: "\u200b" }
        )
        .setTimestamp();

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
      const winRow = new ActionRowBuilder().addComponents(
        ...winButtonsBuilders
      );
      const loseRow = new ActionRowBuilder().addComponents(
        ...loseButtonsBuilders
      );
      const response: Message = await interaction.editReply({
        content: interaction.content,
        embeds: [embed],
        components: [winRow, loseRow],
      });

      const collectorFilter = (i: any) => i.user.id === interaction.user.id;

      try {
        const buttonInteraction = await response.awaitMessageComponent({
          filter: collectorFilter,
          time: 15 * 60_000,
        });

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

          const button = winButtons.find(
            (b) => b.customId === buttonInteraction.customId
          );
          const betAmount = button!.amount!;
          const { error, user: bettingUser } = await getBettingUser(discordId);

          if (error) {
            buttonInteraction.reply({
              content: error,
              flags: MessageFlags.Ephemeral,
            });
          }

          const currency = bettingUser!.currency;

          if (betAmount > currency) {
          } else {
            bettingUser!.currency -= betAmount;
            bettingUser!.timestamp = new Date();
            bettingUser!.data.timesBet += 1;

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
            }

            await buttonInteraction.update({
              content: `${buttonInteraction.customId} has been pressed!`,
              components: [],
            });
          }
        }
      } catch (err) {
        await interaction.editReply({ content: "Cancelling" });
      }

      return;
    }

    interaction.editReply(`idk some shit happened`);
  },
};

export default bet;
