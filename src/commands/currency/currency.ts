import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { getBettingUser } from "../../lib/utils/game.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("currency")
    .setDescription("Show current currency"),
  async execute(interaction: CommandInteraction) {
    const discordId = interaction.user.id;
    const { error, user: bettingUser } = await getBettingUser(discordId);

    if (error || !bettingUser) {
      interaction.reply({
        content: error,
      });
      return;
    }

    interaction.reply({
      content: `You have ${bettingUser.currency.nicu} Nicu and ${bettingUser.currency.tzapi} Tzapi left!`,
    });
  },
};
