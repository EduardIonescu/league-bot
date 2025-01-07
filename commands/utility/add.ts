import { SlashCommandBuilder } from "discord.js";
import {
  Account,
  getSummonerId,
  toTitleCase,
  writeAccountToFile,
} from "../../utils.js";

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

    const summonerId = await getSummonerId(gameName, tagLine);
    if (summonerId && !("status" in summonerId)) {
      const account: Account = {
        gameName,
        tagLine,
        summonerPUUID: summonerId.puuid,
        region,
      };
      const { error } = await writeAccountToFile(account);
      if (error.length === 0) {
        const accountToShow =
          toTitleCase(gameName) + "#" + tagLine.toUpperCase();
        await interaction.editReply(`Account saved:  \`${accountToShow}\``);
        return;
      }

      await interaction.editReply(error);
      return;
    }

    await interaction.editReply("No user found");
  },
};
