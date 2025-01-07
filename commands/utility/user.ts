import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Provides information about the user."),
  async execute(interaction: any) {
    /*  await interaction.deferReply(
      `This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}`
    ); */

    const modal = new ModalBuilder()
      .setCustomId("betModal")
      .setTitle("Bet on the outcome!");

    const amountInput = new TextInputBuilder()
      .setCustomId("amountInput")
      .setLabel("How much do you want to bet?")
      .setStyle(TextInputStyle.Short)
      .setValue("")
      .setRequired()
      .setMaxLength(32);

    const amountActionRow =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        amountInput
      );

    modal.addComponents(amountActionRow);

    await interaction.showModal(modal);
  },
};
