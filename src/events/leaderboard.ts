import { ButtonInteraction, Events } from "discord.js";
import { showLeaderboard } from "../lib/utils/leaderboard.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (interaction.customId !== "leaderboard") {
      return;
    }

    try {
      await showLeaderboard(interaction);
      return;
    } catch {
      return;
    }
  },
};
