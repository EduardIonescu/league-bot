import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";
import { formatChoices, getAccountsSync } from "../../lib/utils/game.js";
import { placeBet } from "../../lib/utils/interaction.js";

const accounts = getAccountsSync();
const choices = formatChoices(accounts);

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
        .addChoices(...choices)
    ),
  async execute(interaction: CommandInteraction) {
    const summonerPUUID = (
      interaction.options as CommandInteractionOptionResolver
    ).getString("account");
    console.log("summonerPUUID", summonerPUUID);

    const account = accounts.find((acc) => acc.summonerPUUID === summonerPUUID);

    await placeBet(interaction, account);
  },
};
