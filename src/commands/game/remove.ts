import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";
import { getAccounts, removeAccount } from "../../lib/db/account.js";
import { logInteractionUsage } from "../../lib/db/logging.js";
import { formatChoices, formatPlayerName } from "../../lib/utils/game.js";

const { accounts } = getAccounts();
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
    const nameAndTag = (
      interaction.options as CommandInteractionOptionResolver
    ).getString("account");

    if (!nameAndTag) {
      interaction.reply("No account found for the selected option.");
      logInteractionUsage(interaction);

      return;
    }

    const { error } = removeAccount(nameAndTag);
    if (error) {
      interaction.reply(error);
      logInteractionUsage(interaction);

      return;
    }

    const [gameName, gameTag] = nameAndTag.split("_");
    const playerName = formatPlayerName(gameName, gameTag);

    interaction.reply(`Account removed: \`${playerName}\``);
    logInteractionUsage(interaction, true);

    return;
  },
};
