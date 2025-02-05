import {
  CommandInteraction,
  CommandInteractionOptionResolver,
  SlashCommandBuilder,
} from "discord.js";
import { addAccount } from "../../lib/db/account.js";
import { Account, Region } from "../../lib/types/riot";
import { formatPlayerName } from "../../lib/utils/game.js";
import { fetchSummonerData } from "../../lib/utils/riot.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add League Summoner's Account for later use")
    .addStringOption((option) =>
      option
        .setName("region")
        .setDescription("Region")
        .setRequired(true)
        .addChoices(
          { name: "Eune", value: "eun1" },
          { name: "Euw", value: "euw1" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name")
        .setMaxLength(64)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("tag")
        .setDescription("Tag")
        .setMaxLength(8)
        .setRequired(true)
    ),
  async execute(
    interaction: CommandInteraction & {
      options: CommandInteractionOptionResolver;
    }
  ) {
    const gameName = interaction.options.getString("name") as string;
    const tagLine = interaction.options.getString("tag") as string;
    const region = interaction.options.getString("region") as Region;

    const { error, summonerData } = await fetchSummonerData(gameName, tagLine);
    if (error || !summonerData) {
      interaction.reply(error ?? "No Summoner Found");
      return;
    }

    const account: Account = {
      gameName,
      tagLine,
      summonerPUUID: summonerData.puuid,
      region,
    };

    const { error: errorAdding } = addAccount(account);
    if (errorAdding) {
      interaction.reply(errorAdding);
      return;
    }

    const accountToShow = formatPlayerName(gameName, tagLine);
    interaction.reply(`Account saved:  \`${accountToShow}\``);
    return;
  },
};
