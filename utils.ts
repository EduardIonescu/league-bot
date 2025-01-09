import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";
import { BETS_CLOSE_AT_GAME_LENGTH, DEFAULT_USER } from "./constants.js";
import { FailedRequest, MatchResult } from "./types.js";

dotenv.config();

export type RegionRiot = "americas" | "europe";
export type Region = "eun1" | "euw1" | "na1";
export type SummonerId = { puuid: string; gameName: string; tagLine: string };
export type Account = {
  gameName: string;
  tagLine: string;
  summonerPUUID: string;
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
  region: Region;
  channelId: string;
  bets: Bet[];
};

export async function getSummonerId(name: string, tag: string) {
  const endpoint =
    "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id";
  const url = `${endpoint}/${name}/${tag}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": process.env.LEAGUE_API ?? "",
      },
    });

    const summonerId = (await response.json()) as SummonerId;

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

export async function getActiveGames() {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL("bets/active/", rootPath);
    const gameFiles = await fs.readdir(activeBetsFolder);

    if (gameFiles.length === 0) {
      return {
        games: undefined,
        error: undefined,
      };
    }

    const games: Match[] = [];
    for (const gameFile of gameFiles) {
      const filePath = new URL(gameFile, activeBetsFolder);
      const game: Match = JSON.parse(await fs.readFile(filePath, "utf8"));
      games.push(game);
    }

    return { games, error: undefined };
  } catch (err) {
    return { games: undefined, error: "Error occured getting active games" };
  }
}

export async function moveFinishedGame(game: Match, win: boolean) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL("bets/active/", rootPath);
    const gameFile = new URL(`${game.summonerId}.json`, activeBetsFolder);
    if (!(await fileExists(gameFile))) {
      return {
        error: "Game not found.",
      };
    }

    const archiveBetsFolder = new URL("bets/archive/", rootPath);
    const newGameFile = new URL(`${game.summonerId}.json`, archiveBetsFolder);
    await fs.rename(gameFile, newGameFile);
    await fs.writeFile(newGameFile, JSON.stringify({ ...game, win }));
    return { error: undefined };
  } catch (err) {
    return {
      error: "Game not found.",
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

    user.currency = Math.floor(user.currency * 10) / 10;
    await fs.writeFile(userFile, JSON.stringify(user));
    return { error: undefined };
  } catch (err) {
    return { error: "An error has occured." };
  }
}

export function canBetOnActiveGame(gameStartTime: number) {
  const differenceInSeconds = Math.ceil((Date.now() - gameStartTime) / 1_000);
  console.log("differenceInSeconds", differenceInSeconds);
  console.log(
    "differenceInSeconds <= BETS_CLOSE_AT_GAME_LENGTH * 60",
    differenceInSeconds <= BETS_CLOSE_AT_GAME_LENGTH * 60
  );
  return differenceInSeconds <= BETS_CLOSE_AT_GAME_LENGTH * 60;
}

/** @param matchId is for example `NA1_5201383209`. It needs the region prefix */
export async function getFinishedMatch(
  matchId: string,
  region: RegionRiot = "europe"
) {
  const endpoint = `https://${region}.api.riotgames.com/lol/match/v5/matches`;
  const url = `${endpoint}/${matchId.toUpperCase()}`;
  try {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": process.env.LEAGUE_API ?? "",
      },
    });

    const match = (await response.json()) as FailedRequest | MatchResult;

    if (!match || ("status" in match && match.status.status_code)) {
      return { active: true, match: undefined };
    }

    return { active: false, match: match as MatchResult };
  } catch (err) {
    console.error(err);
    return { active: false, match: undefined };
  }
}

export type AmountByUser = {
  discordId: string;
  amount: number;
  winnings?: number;
  loss?: number;
};

export async function handleMatchOutcome(game: Match, win: boolean) {
  const { error, game: activeGame } = await getActiveGame(game.summonerId);

  const amountByUser = activeGame!.bets.reduce((acc, cur) => {
    const accumulatedUser = acc.find(
      (user) => user.discordId === cur.discordId
    );
    const amount = win === cur.win ? cur.amount : -cur.amount;
    if (accumulatedUser) {
      accumulatedUser.amount = amount + accumulatedUser.amount;
      return acc;
    }
    return [...acc, { discordId: cur.discordId, amount }];
  }, [] as AmountByUser[]);
  return amountByUser;
}

export function calculateCurrencyOutcome(amountByUser: AmountByUser[]) {
  const winners = amountByUser.filter((entry) => entry.amount > 0);
  const losers = amountByUser.filter((entry) => entry.amount < 0);

  const totalWinnerBet = winners.reduce((acc, cur) => acc + cur.amount, 0);
  const totalLoserBet = Math.abs(
    losers.reduce((acc, cur) => acc + cur.amount, 0)
  );

  const availablePot = Math.min(totalWinnerBet, totalLoserBet);
  let remainingPot = availablePot;
  winners.forEach((winner) => {
    const winnerShare = (winner.amount / totalWinnerBet) * availablePot;
    const winnings = Math.min(winner.amount, winnerShare);
    winner.winnings = Math.floor(winnings * 10) / 10;
    remainingPot -= winner.winnings;
  });

  losers.forEach((loser) => {
    const loss = (Math.abs(loser.amount) / totalLoserBet) * availablePot;
    loser.loss = Math.floor(loss * 10) / 10;
  });

  return { winners, losers };
}
export async function handleWinnerBetResult(users: AmountByUser[]) {
  const timestamp = new Date();

  const winners = users.map(async (user) => {
    const { error, user: bettingUser } = await getBettingUser(user.discordId);
    if (!bettingUser) {
      return;
    }

    const currency = user.amount + (user.winnings ?? 0) + bettingUser.currency;
    const wins = bettingUser.data.wins + 1;
    const currencyWon = bettingUser.data.currencyWon + (user.winnings ?? 0);
    const data = { ...bettingUser.data, wins, currencyWon };
    const updatedUser = { ...bettingUser, timestamp, currency, data };

    await updateUser(updatedUser);
    return { updatedUser, winnings: user.winnings ?? 0 };
  });

  return (await Promise.all(winners)).filter((winner) => winner != undefined);
}

export async function handleLoserBetResult(users: AmountByUser[]) {
  const timestamp = new Date();

  const losers = users.map(async (user) => {
    const { error, user: bettingUser } = await getBettingUser(user.discordId);
    if (!bettingUser) {
      return;
    }

    const loses = bettingUser.data.loses + 1;
    const currency =
      bettingUser.currency + Math.abs(user.amount) - (user.loss ?? 0);
    const currencyLost = bettingUser.data.currencyLost + (user.loss ?? 0);
    const data = { ...bettingUser.data, loses, currencyLost };
    const updatedUser = { ...bettingUser, timestamp, currency, data };

    await updateUser(updatedUser);
    return { updatedUser, loss: user.loss ?? 0 };
  });

  return (await Promise.all(losers)).filter((loser) => loser != undefined);
}

export async function getLeaderboard() {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const userFolderPath = new URL("users/", rootPath);
    const userFolder = await fs.readdir(userFolderPath);

    const users: BettingUser[] = [];
    for (const userFile of userFolder) {
      const filePath = new URL(userFile, userFolderPath);
      const user: BettingUser = JSON.parse(await fs.readFile(filePath, "utf8"));
      users.push(user);
    }

    users.sort((a, b) => b.currency - a.currency);

    return {
      error: undefined,
      users,
    };
  } catch (err) {
    return {
      error: "Users not found.",
      users: undefined,
    };
  }
}
