import { SlashCommandBuilder } from "discord.js";
import { Account } from "../../lib/types/riot";
import { formatPlayerName, writeAccountToFile } from "../../lib/utils/game.js";
import { getSummonerData } from "../../lib/utils/riot";

type Region = "eun1" | "euw1";

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
  async execute(interaction: any) {
    await interaction.deferReply();

    const gameName: string = interaction.options.getString("name");
    const tagLine: string = interaction.options.getString("tag");
    const region: Region = interaction.options.getString("region");

    const { error, summonerData } = await getSummonerData(gameName, tagLine);
    if (error || !summonerData) {
      await interaction.editReply(error ?? "No Summoner Found");
      return;
    }

    const account: Account = {
      gameName,
      tagLine,
      summonerPUUID: summonerData.puuid,
      region,
    };

    const { error: errorWriting } = await writeAccountToFile(account);
    if (errorWriting) {
      await interaction.editReply(errorWriting);
      return;
    }

    const accountToShow = formatPlayerName(gameName, tagLine);
    await interaction.editReply(`Account saved:  \`${accountToShow}\``);
    return;
  },
};
