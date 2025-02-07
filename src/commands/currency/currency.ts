import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { logInteractionUsage } from "../../lib/db/logging.js";
import { getUser } from "../../lib/db/user.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("currency")
    .setDescription("Show current currency"),
  async execute(interaction: CommandInteraction) {
    const discordId = interaction.user.id;
    const { error, user } = getUser(discordId);

    if (error || !user) {
      interaction.reply(error);
      logInteractionUsage(interaction);

      return;
    }

    interaction.reply(
      `You have ${user.balance.nicu} Nicu and ${user.balance.tzapi} Tzapi left!`
    );
    logInteractionUsage(interaction, true);
  },
};
