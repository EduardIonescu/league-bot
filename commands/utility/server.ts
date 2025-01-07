import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";
import { loseButtons, winButtons } from "../../constants.js";

export default {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Provides information about the server"),
  async execute(interaction: any) {
    await interaction.reply(
      `This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members`
    );

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
    } catch (e) {
      await interaction.editReply({
        content: `Session expired. Use the command again.`,
        components: [],
      });
    }
  },
};
