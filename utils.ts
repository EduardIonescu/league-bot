import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";
import { DEFAULT_USER } from "./constants.js";

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

export type BettingUser = {
  discordId: string;
  currency: number;
  timestamp: Date;
  data: {
    timesBet: number;
    wins: number;
    loses: number;
    currencyWon: number;
    currencyLost: number;
  };
};

export type Bet = {
  discordId: string;
  amount: number;
  win: boolean;
  timestamp: Date;
  inGameTime: number;
};
export type Match = {
  gameId: string;
  player: string;
  summonerId: string;
  inGameTime: number;
  gameStartTime: number;
  bets: Bet[];
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

export function toTitleCase(str: string) {
  return str
    .toLocaleLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function getBettingUser(discordId: string) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const usersFolder = new URL("users/", rootPath);
    const userFile = new URL(`${discordId}.json`, usersFolder);

    if (await fileExists(userFile)) {
      const user: BettingUser = JSON.parse(await fs.readFile(userFile, "utf8"));
      return { error: undefined, user };
    } else {
      // Create default user and write it to file.
      const user: BettingUser = {
        discordId,
        currency: DEFAULT_USER.currency,
        timestamp: new Date(),
        data: DEFAULT_USER.data,
      };

      await fs.writeFile(userFile, JSON.stringify(user));
      return { error: undefined, user };
    }
  } catch (err) {
    return { error: "An error has occured.", user: undefined };
  }
}

export async function getActiveGame(summonerId: string) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL("bets/active/", rootPath);
    const gameFile = new URL(`${summonerId}.json`, activeBetsFolder);
    if (await fileExists(gameFile)) {
      const game: Match = JSON.parse(await fs.readFile(gameFile, "utf8"));
      return { error: undefined, game };
    } else {
      return {
        error: "Game not found.",
        game: undefined,
      };
    }
  } catch (err) {
    return {
      error: "Game not found.",
      game: undefined,
    };
  }
}

export async function updateActiveGame(game: Match) {
  const summonerId = game.summonerId;
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL("bets/active/", rootPath);
    const gameFile = new URL(`${summonerId}.json`, activeBetsFolder);
    await fs.writeFile(gameFile, JSON.stringify(game));

    return { error: undefined };
  } catch (err) {
    return { error: "An error has occured updating active game." };
  }
}

export async function updateUser(user: BettingUser) {
  const { discordId } = user;
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const usersFolder = new URL("users/", rootPath);
    const userFile = new URL(`${discordId}.json`, usersFolder);

    await fs.writeFile(userFile, JSON.stringify(user));
    return { error: undefined };
  } catch (err) {
    return { error: "An error has occured." };
  }
}
