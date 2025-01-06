import { SlashCommandBuilder } from "discord.js";
import * as fs from "node:fs";
import { Account, getSpectatorData } from "../../utils.js";

let choices: { name: string; value: string }[] = [];
const accounts: Account[] = [];

const rootPath = import.meta.url.split("dist/")[0];
const accountsFolder = new URL("accounts/", rootPath);
const accountFiles = fs.readdirSync(accountsFolder);
for (const file of accountFiles) {
  const filePath = new URL(file, accountsFolder);
  const account = JSON.parse(fs.readFileSync(filePath, "utf8"));
  accounts.push(account);
  choices.push({
    name: `${account.gameName}#${account.tagLine}`,
    value: `${account.summonerPUUID}`,
  });
}

const bet = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet on League matches outcomes")
    .addStringOption((option) =>
      option
        .setName("account")
        .setDescription("Account")
        .setRequired(true)
        .addChoices(...choices)
    ),
  async execute(interaction: any) {
    await interaction.deferReply();
    const summonerPUUID = interaction.options.getString("account");
    const account = accounts.find((acc) => acc.summonerPUUID === summonerPUUID);

    if (account?.region) {
      const game = await getSpectatorData(summonerPUUID, account.region);
      console.log("game", game);
      const isInGame = game?.gameId ? "is in game" : "is not in game";
      await interaction.editReply(`${account.gameName} ${isInGame}`);
      return;
    }

    interaction.editReply(`idk some shit happened`);
  },
};

export default bet;
