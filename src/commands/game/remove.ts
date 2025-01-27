import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";
import {
  formatChoices,
  formatPlayerName,
  getAccountsSync,
  removeAccountFile,
} from "../../lib/utils/game.js";

const accounts = getAccountsSync();
const choices = formatChoices(accounts, false);

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove League Summoner's Account from saved")
    .addStringOption((option) =>
      option
        .setName("account")
        .setDescription("Account")
        .setRequired(true)
        .addChoices(...choices)
    ),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const nameAndTag = (
      interaction.options as CommandInteractionOptionResolver
    ).getString("account");

    if (!nameAndTag) {
      await interaction.editReply("No account found for the selected option.");
      return;
    }

    const { error } = await removeAccountFile(nameAndTag);
    if (error) {
      await interaction.editReply(error);
      return;
    }

    const [gameName, gameTag] = nameAndTag.split("_");
    const playerName = formatPlayerName(gameName, gameTag);

    await interaction.editReply(`Account removed: \`${playerName}\``);
    return;
  },
};
