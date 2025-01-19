import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import {
  BETS_CLOSE_AT_GAME_LENGTH,
  DEFAULT_USER,
  loseButtons,
  winButtons,
} from "../constants.js";
import {
  AmountByUser,
  Bet,
  BettingUser,
  Choice,
  Match,
} from "../types/common.js";
import { Account } from "../types/riot";
import { toTitleCase } from "./common.js";

export async function writeAccountToFile(account: Account) {
  const nameAndTag = (account.gameName + "_" + account.tagLine).toLowerCase();
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const accountsFolder = new URL("data/accounts/", rootPath);
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

export async function getBettingUser(discordId: string) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const usersFolder = new URL("data/users/", rootPath);
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
    const activeBetsFolder = new URL("data/bets/active/", rootPath);
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
    const activeBetsFolder = new URL("data/bets/active/", rootPath);
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
    const activeBetsFolder = new URL("data/bets/active/", rootPath);
    const gameFile = new URL(`${game.summonerId}.json`, activeBetsFolder);
    if (!(await fileExists(gameFile))) {
      return {
        error: "Game not found.",
      };
    }

    const archiveBetsFolder = new URL("data/bets/archive/", rootPath);
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
    const activeBetsFolder = new URL("data/bets/active/", rootPath);
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
    const usersFolder = new URL("data/users/", rootPath);
    const userFile = new URL(`${discordId}.json`, usersFolder);

    user.currency.tzapi = Math.floor(user.currency.tzapi * 10) / 10;
    await fs.writeFile(userFile, JSON.stringify(user));
    return { error: undefined };
  } catch (err) {
    return { error: "An error has occured." };
  }
}

export function canBetOnActiveGame(gameStartTime: number) {
  const differenceInSeconds = Math.ceil((Date.now() - gameStartTime) / 1_000);

  return differenceInSeconds <= BETS_CLOSE_AT_GAME_LENGTH * 60;
}

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

export async function handleWinnerBetResult(users: AmountByUser[]) {
  const timestamp = new Date();

  const winners = users.map(async (user) => {
    const { error, user: bettingUser } = await getBettingUser(user.discordId);
    if (!bettingUser) {
      return;
    }

    const tzapi =
      user.amount + (user.winnings ?? 0) + bettingUser.currency.tzapi;
    const currency = { ...bettingUser.currency, tzapi };
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
    const tzapi =
      bettingUser.currency.tzapi + Math.abs(user.amount) - (user.loss ?? 0);
    const currency = { ...bettingUser.currency, tzapi };
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
    const userFolderPath = new URL("data/users/", rootPath);
    const userFolder = await fs.readdir(userFolderPath);

    const users: BettingUser[] = [];
    for (const userFile of userFolder) {
      const filePath = new URL(userFile, userFolderPath);
      const user: BettingUser = JSON.parse(await fs.readFile(filePath, "utf8"));
      users.push(user);
    }

    users.sort((a, b) => {
      if (b.currency.nicu === a.currency.nicu) {
        return b.currency.tzapi - a.currency.tzapi;
      } else {
        return b.currency.nicu - a.currency.nicu;
      }
    });

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

export async function getAccounts() {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const accountsFolderPath = new URL("data/accounts/", rootPath);
    const accountsFolder = await fs.readdir(accountsFolderPath);

    const accounts: Account[] = [];
    for (const accountFile of accountsFolder) {
      const filePath = new URL(accountFile, accountsFolderPath);
      const account: Account = JSON.parse(await fs.readFile(filePath, "utf8"));
      accounts.push(account);
    }

    return { accounts, error: undefined };
  } catch (err) {
    return {
      accounts: undefined,
      error: "Accounts not found.",
    };
  }
}

export function getAccountsSync() {
  const accounts: Account[] = [];

  const rootPath = import.meta.url.split("dist/")[0];
  const accountsFolder = new URL("data/accounts/", rootPath);
  const accountFiles = fsSync.readdirSync(accountsFolder);
  for (const file of accountFiles) {
    const filePath = new URL(file, accountsFolder);
    const account = JSON.parse(fsSync.readFileSync(filePath, "utf8"));
    accounts.push(account);
  }

  return accounts;
}

export function formatChoices(accounts: Account[]) {
  const choices: Choice[] = accounts.map((account) => ({
    name: formatPlayerName(account.gameName, account.tagLine),
    value: `${account.summonerPUUID}`,
  }));

  return choices;
}

export function formatPlayerName(gameName: string, tagLine: string) {
  return `${toTitleCase(gameName)}#${tagLine.toUpperCase()}`;
}

export function bettingButtons() {
  const winButtonsBuilders = winButtons.map((button) =>
    new ButtonBuilder()
      .setLabel(button.label)
      .setCustomId(button.customId)
      .setStyle(ButtonStyle.Primary)
  );
  const loseButtonsBuilders = loseButtons.map((button) =>
    new ButtonBuilder()
      .setLabel(button.label)
      .setCustomId(button.customId)
      .setStyle(ButtonStyle.Danger)
  );
  const winRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...winButtonsBuilders
  );
  const loseRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...loseButtonsBuilders
  );

  return { winRow, loseRow };
}

export function getTotalBets(bets: Bet[]) {
  const totalBetWin = bets.reduce(
    (acc, cur) => acc + (cur.win ? cur.amount : 0),
    0
  );
  const totalBetLose = bets.reduce(
    (acc, cur) => acc + (cur.win ? 0 : cur.amount),
    0
  );

  return { totalBetWin, totalBetLose };
}
