import { ButtonInteraction, Events } from "discord.js";
import { check } from "../lib/utils/check.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (interaction.customId !== "check") {
      return;
    }

    try {
      await check(interaction);
      return;
    } catch {
      return;
    }
  },
};
