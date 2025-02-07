import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { logInteractionUsage } from "../../lib/db/logging.js";

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Show roundtrip latency"),
  async execute(interaction: CommandInteraction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      fetchReply: true,
    });
    interaction.editReply(
      `Roundtrip latency: ${
        sent.createdTimestamp - interaction.createdTimestamp
      }ms`
    );
    logInteractionUsage(interaction, true);
  },
};
