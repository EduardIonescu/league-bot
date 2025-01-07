import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { getBettingUser } from "../../utils.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("currency")
    .setDescription("Show current currency"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    const discordId = interaction.user.id;

    const { error, user: bettingUser } = await getBettingUser(discordId);

    if (error || !bettingUser) {
      await interaction.editReply({
        content: error,
      });
      return;
    }

    await interaction.editReply({
      content: `You have ${bettingUser.currency} Tzapi left!`,
    });
  },
};
