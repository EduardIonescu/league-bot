import { SlashCommandBuilder } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

type Region = "eun1" | "euw1";
type RiotId = { puuid: string; gameName: string; tagLine: string };

async function getRiotId(name: string, tag: string) {
  const endpoint =
    "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id";
  const url = `${endpoint}/${name}/${tag}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": process.env.LEAGUE_API ?? "",
      },
    });

    const riotId = (await response.json()) as RiotId;

    return riotId;
  } catch (err) {
    console.error(err);
    return;
  }
}

async function getSummonerId(riotId: RiotId, region: Region) {
  const { puuid } = riotId;

  const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  try {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": process.env.LEAGUE_API ?? "",
      },
    });

    const summonerId = await response.json();
    return summonerId;
  } catch (err) {
    console.error(err);
    return;
  }
}

async function getSpectatorData(summonerId: any, region: Region) {
  const { puuid } = summonerId;
  const endpoint = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner`;

  const url = `${endpoint}/${puuid}`;
  console.log("url", url);

  try {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": process.env.LEAGUE_API ?? "",
      },
    });

    const spectatorData = await response.json();
    return spectatorData;
  } catch (err) {
    console.error(err);
    return;
  }
}

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("echo")
    .setDescription("Replies with your input!")
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
    await interaction.reply(
      `Name: ${interaction.options.getString("name")}\n
     Tag: ${interaction.options.getString("tag")}\n
     Region: ${interaction.options.getString("region")}
     `
    );

    const name = interaction.options.getString("name");
    const tag = interaction.options.getString("tag");
    const region: Region = interaction.options.getString("region");
    const riotId = await getRiotId(name, tag);
    if (riotId) {
      const summonerId = await getSummonerId(riotId, region);
      console.log("summonerId", summonerId);
      if (summonerId) {
        const spectatorData = await getSpectatorData(summonerId, region);
        console.log("spectatorData", spectatorData);

        if (spectatorData?.status?.status_code === 404) {
          interaction.reply(spectatorData.status.message);
        }
      }
    }
  },
};
