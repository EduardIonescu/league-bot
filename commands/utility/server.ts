import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { loseButtons, winButtons } from "../../constants.js";
import {
  Bet,
  getActiveGame,
  getBettingUser,
  updateActiveGame,
  updateUser,
} from "../../utils.js";
const gameId = "EUN1_3722441721";

export default {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Provides information about the server"),
  async execute(interaction: any) {
    await interaction.reply(
      `This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members`
    );

    const { game, error } = await getActiveGame(gameId);
    if (!game || error) {
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
    const winRow = new ActionRowBuilder().addComponents(...winButtonsBuilders);
    const loseRow = new ActionRowBuilder().addComponents(
      ...loseButtonsBuilders
    );
    const response = await interaction.editReply({
      content: `Are you sure you want to ban ${interaction.guild.name}?`,
      components: [winRow, loseRow],
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;

    try {
      const buttonInteraction: ButtonInteraction =
        await response.awaitMessageComponent({
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
          interaction.reply({ content: error, flags: MessageFlags.Ephemeral });
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
        }

        await buttonInteraction.update({
          content: `${buttonInteraction.customId} has been pressed!`,
          components: [],
        });
      }
    } catch (e) {
      await interaction.editReply({
        content: `Session expired. Use the command again.`,
        components: [],
      });
    }
  },
};
