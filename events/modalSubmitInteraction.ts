import { CommandInteraction, Events, ModalSubmitInteraction } from "discord.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: CommandInteraction) {
    if (!interaction.isModalSubmit()) {
      return;
    }

    const modalInteraction = interaction as ModalSubmitInteraction;

    if (modalInteraction.customId === "betModal") {
      await modalInteraction.reply({ content: "Your bet has been placed" });
    }
  },
};
