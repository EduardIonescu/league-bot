import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { showLeaderboard } from "../../lib/utils/leaderboard.js";

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top betters by results."),
  async execute(interaction: CommandInteraction) {
    await showLeaderboard(interaction);
  },
};
