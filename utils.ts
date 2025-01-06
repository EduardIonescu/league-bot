import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";

dotenv.config();

export type Region = "eun1" | "euw1";
export type RiotId = { puuid: string; gameName: string; tagLine: string };
export type Account = {
  gameName: string;
  tagLine: string;
  summonerPUUID: string;
  riotIdPUUID: string;
  region: Region;
};

export async function getRiotId(name: string, tag: string) {
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

export async function getSummonerId(riotId: RiotId, region: Region) {
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

export async function getSpectatorData(summonerPUUID: string, region: Region) {
  const endpoint = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner`;

  const url = `${endpoint}/${summonerPUUID}`;
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

export async function writeAccountToFile(account: Account) {
  const nameAndTag = (account.gameName + "_" + account.tagLine).toLowerCase();
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const accountsFolder = new URL("accounts/", rootPath);
    const accountFile = new URL(`${nameAndTag}.json`, accountsFolder);
    console.log("accountsFolder", JSON.stringify(accountFile));
    if (await fileExists(accountFile)) {
      return { error: "The account is already saved." };
    }
    await fs.writeFile(accountFile, JSON.stringify(account));
    return { error: "" };
  } catch (err) {
    return { error: "An error has occured." };
  }
}

async function fileExists(filePath: URL) {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}
