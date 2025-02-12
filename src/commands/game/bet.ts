import {
  AutocompleteInteraction,
  CommandInteraction,
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";
import { getAccount } from "../../lib/db/account.js";
import { getAndCacheAccounts } from "../../lib/utils/accountsCache.js";
import { formatPlayerName } from "../../lib/utils/game.js";
import { startBet } from "../../lib/utils/interaction.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet on League matches' outcomes vs the bot.")
    .addStringOption((option) =>
      option
        .setName("account")
        .setDescription("Account")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);

    const { error, accounts } = getAndCacheAccounts(interaction.guildId!);

    if (error || !accounts) {
      await interaction.respond([]);
      return;
    }

    const filtered = accounts.filter((account) =>
      formatPlayerName(account.gameName, account.tagLine)
        .toLowerCase()
        .includes(focusedOption.value.toLowerCase())
    );

    await interaction.respond(
      filtered.map((choice) => ({
        name: formatPlayerName(choice.gameName, choice.tagLine),
        value: choice.summonerPUUID,
      }))
    );
  },
  async execute(interaction: CommandInteraction) {
    const summonerPUUID = (
      interaction.options as CommandInteractionOptionResolver
    ).getString("account");

    const { account } = getAccount(summonerPUUID ?? "", interaction.guildId!);

    await startBet(interaction, account);
  },
};
