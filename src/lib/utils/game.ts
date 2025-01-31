import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  RestOrArray,
} from "discord.js";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import champions from "../../assets/champions.js";
import perks from "../../assets/perks.js";
import summonerSpells from "../../assets/summonerSpells.js";
import { ParticipantStats } from "../components/spectatorMatch.js";
import {
  BETS_CLOSE_AT_GAME_LENGTH,
  DEFAULT_USER,
  IMAGE_NOT_FOUND,
  loseButtons,
  winButtons,
  ZERO_CURRENCIES,
} from "../constants.js";
import {
  AmountByUser,
  Bet,
  BettingUser,
  Choice,
  FinishedMatch,
  FinishedMatchParticipant,
  Lane,
  LoserBetingUser,
  Match,
  RefundedBettingUser,
  SentIn,
  WinnerBetingUser,
} from "../types/common.js";
import { Account, MatchResult, SpectatorParticipant } from "../types/riot.js";
import {
  encodeBase1114111,
  filePathExists,
  htmlImgSrcFromPath,
  toTitleCase,
} from "./common.js";

export async function writeAccountToFile(account: Account) {
  const nameAndTag = (account.gameName + "_" + account.tagLine).toLowerCase();
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const accountsFolder = new URL("src/data/accounts/", rootPath);
    const accountFile = new URL(`${nameAndTag}.json`, accountsFolder);
    if (await filePathExists(accountFile)) {
      return { error: "The account is already saved." };
    }
    await fs.writeFile(accountFile, JSON.stringify(account));
    return { error: "" };
  } catch (err) {
    return { error: "An error has occured." };
  }
}

export async function removeAccountFile(nameAndTag: string) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const accountsFolder = new URL("src/data/accounts/", rootPath);
    const accountFile = new URL(`${nameAndTag}.json`, accountsFolder);

    if (!(await filePathExists(accountFile))) {
      return { error: "The account doesn't exist." };
    }
    await fs.rm(accountFile);
    return { error: undefined };
  } catch (error) {
    console.log(error);
    return {
      error:
        "An error has occured. The account might not exist. Try again if it does.",
    };
  }
}

export async function getBettingUser(discordId: string) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const usersFolder = new URL("src/data/users/", rootPath);
    const userFile = new URL(`${discordId}.json`, usersFolder);

    if (await filePathExists(userFile)) {
      const user: BettingUser = JSON.parse(await fs.readFile(userFile, "utf8"));
      return { error: undefined, user };
    } else {
      // Create default user and write it to file.
      const user: BettingUser = {
        discordId,
        currency: DEFAULT_USER.currency,
        timestamp: { lastAction: new Date(), lastRedeemed: undefined },
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
    const activeBetsFolder = new URL("src/data/bets/active/", rootPath);
    const gameFile = new URL(`${summonerId}.json`, activeBetsFolder);
    if (await filePathExists(gameFile)) {
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
    const activeBetsFolder = new URL("src/data/bets/active/", rootPath);
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

export async function getFinishedGame(summonerPUUID: string, gameId: string) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL(
      `src/data/bets/archive/${summonerPUUID}/`,
      rootPath
    );
    const gameFile = new URL(`${gameId}.json`, activeBetsFolder);
    if (!(await filePathExists(gameFile))) {
      return { match: undefined, error: "Game not found." };
    }

    const match: FinishedMatch = JSON.parse(
      await fs.readFile(gameFile, "utf8")
    );

    if (!match) {
      return { match: undefined, error: "Game found, but no data found." };
    }

    return { match, error: undefined };
  } catch (err) {
    console.log(err);
    return { match: undefined, error: "Failed to get the finished match." };
  }
}

export async function moveFinishedGame(
  game: Match,
  matchResult: MatchResult,
  win: boolean | "remake"
) {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL("src/data/bets/active/", rootPath);
    const gameFile = new URL(`${game.summonerId}.json`, activeBetsFolder);
    if (!(await filePathExists(gameFile))) {
      return {
        error: "Game not found.",
      };
    }

    const archiveBetsFolder = new URL(
      `src/data/bets/archive/${game.summonerId}/`,
      rootPath
    );
    if (!(await filePathExists(archiveBetsFolder))) {
      await fs.mkdir(archiveBetsFolder);
    }

    const newGameFile = new URL(
      `${matchResult.metadata.matchId}.json`,
      archiveBetsFolder
    );
    await fs.rename(gameFile, newGameFile);

    const participants: FinishedMatchParticipant[] =
      matchResult.info.participants.map((participant) => {
        const {
          kills,
          assists,
          deaths,
          totalDamageDealtToChampions,
          teamPosition,
          championId,
          champLevel,
          summoner1Id,
          summoner2Id,
          totalMinionsKilled,
          item0,
          item1,
          item2,
          item3,
          item4,
          item5,
          item6,
          perks,
          puuid,
          riotIdGameName,
          riotIdTagline,
          teamId,
          neutralMinionsKilled,
          win,
        } = participant;
        return {
          kills,
          assists,
          deaths,
          totalDamageDealtToChampions,
          teamPosition,
          championId,
          champLevel,
          summoner1Id,
          summoner2Id,
          totalMinionsKilled,
          item0,
          item1,
          item2,
          item3,
          item4,
          item5,
          item6,
          perks,
          puuid,
          riotIdGameName,
          riotIdTagline,
          teamId,
          neutralMinionsKilled,
          win,
        };
      });

    const gameDuration = matchResult.info.gameDuration;

    await fs.writeFile(
      newGameFile,
      JSON.stringify({ ...game, win, participants, gameDuration })
    );
    return { error: undefined };
  } catch (err) {
    return {
      error: err,
    };
  }
}

export async function updateActiveGame(game: Match) {
  const summonerId = game.summonerId;
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const activeBetsFolder = new URL("src/data/bets/active/", rootPath);
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
    const usersFolder = new URL("src/data/users/", rootPath);
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
    const outcome = win === cur.win ? 1 : -1;
    const amount = {
      tzapi: cur.amount.tzapi * outcome,
      nicu: cur.amount.nicu * outcome,
    };
    if (accumulatedUser) {
      accumulatedUser.amount = {
        tzapi: amount.tzapi + accumulatedUser.amount.tzapi,
        nicu: amount.nicu + accumulatedUser.amount.nicu,
      };
      return acc;
    }
    return [...acc, { discordId: cur.discordId, amount }];
  }, [] as AmountByUser[]);
  return amountByUser;
}

export async function handleRemake(game: Match) {
  const { error, game: activeGame } = await getActiveGame(game.summonerId);

  const amountByUser = activeGame!.bets.reduce((acc, cur) => {
    const accumulatedUser = acc.find(
      (user) => user.discordId === cur.discordId
    );
    if (accumulatedUser) {
      accumulatedUser.amount = {
        tzapi: cur.amount.tzapi + accumulatedUser.amount.tzapi,
        nicu: cur.amount.nicu + accumulatedUser.amount.nicu,
      };
      return acc;
    }
    return [...acc, { discordId: cur.discordId, amount: cur.amount }];
  }, [] as AmountByUser[]);
  return amountByUser;
}

export async function refundUsers(users: AmountByUser[]) {
  const bettingUsers = users.map(async (user) => {
    const { error, user: bettingUser } = await getBettingUser(user.discordId);

    if (!bettingUser) {
      return;
    }

    const timestamp = { ...bettingUser.timestamp, lastAction: new Date() };
    const tzapi = user.amount.tzapi + bettingUser.currency.tzapi;
    const nicu = user.amount.nicu + bettingUser.currency.nicu;

    const currency = { ...bettingUser.currency, tzapi, nicu };

    const updatedUser = { ...bettingUser, timestamp, currency };

    await updateUser(updatedUser);

    return { updatedUser, refund: user.amount ?? ZERO_CURRENCIES };
  });

  return (await Promise.all(bettingUsers)).filter((user) => user != undefined);
}

export async function handleWinnerBetResult(users: AmountByUser[]) {
  const winners = users.map(async (user) => {
    const { error, user: bettingUser } = await getBettingUser(user.discordId);
    if (!bettingUser) {
      return;
    }

    const timestamp = { ...bettingUser.timestamp, lastAction: new Date() };
    const tzapi =
      user.amount.tzapi +
      (user.winnings?.tzapi ?? 0) +
      bettingUser.currency.tzapi;
    const nicu =
      user.amount.nicu + (user.winnings?.nicu ?? 0) + bettingUser.currency.nicu;
    const currency = { ...bettingUser.currency, tzapi, nicu };
    const wins = bettingUser.data.wins + 1;
    const currencyWon = {
      tzapi: bettingUser.data.currencyWon.tzapi + (user.winnings?.tzapi ?? 0),
      nicu: bettingUser.data.currencyWon.nicu + (user.winnings?.nicu ?? 0),
    };
    const data = { ...bettingUser.data, wins, currencyWon };
    const updatedUser = { ...bettingUser, timestamp, currency, data };

    await updateUser(updatedUser);
    return { updatedUser, winnings: user.winnings ?? ZERO_CURRENCIES };
  });

  return (await Promise.all(winners)).filter((winner) => winner != undefined);
}

export async function handleLoserBetResult(users: AmountByUser[]) {
  const losers = users.map(async (user) => {
    const { error, user: bettingUser } = await getBettingUser(user.discordId);
    if (!bettingUser) {
      return;
    }

    const timestamp = { ...bettingUser.timestamp, lastAction: new Date() };
    const loses = bettingUser.data.loses + 1;
    const tzapi =
      bettingUser.currency.tzapi +
      Math.abs(user.amount.tzapi) -
      (user.loss?.tzapi ?? 0);
    const nicu =
      bettingUser.currency.nicu +
      Math.abs(user.amount.nicu) -
      (user.loss?.nicu ?? 0);
    const currency = { ...bettingUser.currency, tzapi, nicu };
    const currencyLost = {
      tzapi: bettingUser.data.currencyLost.tzapi + (user.loss?.tzapi ?? 0),
      nicu: bettingUser.data.currencyLost.nicu + (user.loss?.nicu ?? 0),
    };
    const data = { ...bettingUser.data, loses, currencyLost };
    const updatedUser = { ...bettingUser, timestamp, currency, data };

    await updateUser(updatedUser);
    return { updatedUser, loss: user.loss ?? ZERO_CURRENCIES };
  });

  return (await Promise.all(losers)).filter((loser) => loser != undefined);
}

export async function getAccounts() {
  try {
    const rootPath = import.meta.url.split("dist/")[0];
    const accountsFolderPath = new URL("src/data/accounts/", rootPath);
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
  const accountsFolder = new URL("src/data/accounts/", rootPath);
  const accountFiles = fsSync.readdirSync(accountsFolder);
  for (const file of accountFiles) {
    const filePath = new URL(file, accountsFolder);
    const account = JSON.parse(fsSync.readFileSync(filePath, "utf8"));
    accounts.push(account);
  }

  return accounts;
}

export function formatChoices(
  accounts: Account[],
  valueIsSummonerPUUID: boolean = true
) {
  const choices: Choice[] = accounts.map((account) => {
    const nameAndTag = (account.gameName + "_" + account.tagLine).toLowerCase();
    const value = valueIsSummonerPUUID ? account.summonerPUUID : nameAndTag;

    return {
      name: formatPlayerName(account.gameName, account.tagLine),
      value,
    };
  });

  return choices;
}

/** Returns player name as `Demon#Ikspe`  */
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
    (acc, cur) => ({
      tzapi: acc.tzapi + (cur.win ? cur.amount.tzapi : 0),
      nicu: acc.nicu + (cur.win ? cur.amount.nicu : 0),
    }),
    ZERO_CURRENCIES
  );
  const totalBetLose = bets.reduce(
    (acc, cur) => ({
      tzapi: acc.tzapi + (cur.win ? 0 : cur.amount.tzapi),
      nicu: acc.nicu + (cur.win ? 0 : cur.amount.nicu),
    }),

    ZERO_CURRENCIES
  );

  return { totalBetWin, totalBetLose };
}

export function calculateLaneWeights(participant: SpectatorParticipant) {
  const spell1 = summonerSpells[participant.spell1Id];
  const spell2 = summonerSpells[participant.spell2Id];

  const weights: { [key in Lane]: number } = {
    top: 0,
    jungle: 0,
    mid: 0,
    bot: 0,
    support: 0,
  };

  if (spell1.name === "Smite" || spell2.name === "Smite") {
    weights.jungle += 100;
    return weights;
  }

  const champion = champions.find((c) => c.id === participant.championId);

  Object.entries(spell1.weights).forEach(
    ([lane, weight]) => (weights[lane as Lane] += weight)
  );
  Object.entries(spell2.weights).forEach(
    ([lane, weight]) => (weights[lane as Lane] += weight)
  );

  if (champion) {
    // - 0.1 * index so the first lanes have more importance
    champion.lanes.forEach((lane, index) =>
      lane === "support"
        ? (weights[lane] += 0.5 - 0.1 * index)
        : (weights[lane] += 0.3 - 0.1 * index)
    );
  }

  return weights;
}

export function guessTeamLanes(participants: ParticipantStats[]) {
  let top, jungle, mid, bot, support;

  let { participantLane: jungleTemp, newParticipants } = highestWeightLane(
    "jungle",
    participants
  );
  jungle = jungleTemp;

  let { participantLane: supportTemp, newParticipants: newParticipants1 } =
    highestWeightLane("support", newParticipants);
  support = supportTemp;

  let { participantLane: topTemp, newParticipants: newParticipants2 } =
    highestWeightLane("top", newParticipants1);
  top = topTemp;

  let { participantLane: midTemp, newParticipants: newParticipants3 } =
    highestWeightLane("mid", newParticipants2);
  mid = midTemp;

  bot = newParticipants3[0];

  return [top, jungle, mid, bot, support];
}

export function highestWeightLane(
  lane: Lane,
  participants: ParticipantStats[]
) {
  let participantLane: ParticipantStats = participants[0];
  for (const participant of participants) {
    if (
      (participant.weights[lane] ?? 0) > (participantLane.weights[lane] ?? 0)
    ) {
      participantLane = participant;
    }
  }

  const newParticipants = participants.filter(
    (participant) => participant.riotId !== participantLane.riotId
  );

  return { participantLane, newParticipants };
}
export function createRemakeEmbed(
  game: Match,
  updatedUsers: RefundedBettingUser[]
) {
  const usersFields: RestOrArray<APIEmbedField> = [
    { name: "Refunds :triumph:", value: `\u200b` },
    ...updatedUsers.map((user) => {
      const { tzapi, nicu } = user.refund;
      const tzapiMsg = tzapi ? `${tzapi} Tzapi` : "";
      const nicuMsg = nicu ? `${nicu} Nicu ` : "";
      return {
        name: `\u200b`,
        value: `<@${user.updatedUser.discordId}> was refunded ${nicuMsg}${tzapiMsg}!`,
      };
    }),
  ];

  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("League Bets :coin:")
    .setDescription(
      `The bet on \`${game.player}\`'s match has resolved. It was a remake`
    )
    .addFields(
      { name: "Total Bets Placed", value: `${game.bets.length}` },
      { name: "\u200b", value: "\u200b" },
      ...usersFields,
      { name: "\u200b", value: "\u200b" }
    )
    .setTimestamp();
}

export async function sendEmbedToChannels(
  client: Client,
  sentIn: SentIn,
  embed: EmbedBuilder,
  components: ActionRowBuilder<ButtonBuilder>[] = []
) {
  for (const { channelId } of sentIn) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isSendable()) {
        channel.send({ embeds: [embed], components });
      } else {
        console.log("channel is not sendable");
      }
    } catch (err) {
      console.log("error sending message", err);
    }
  }
}

export function splitBets(betByUser: AmountByUser[]) {
  let winners: AmountByUser[] = [];
  let losers: AmountByUser[] = [];
  for (const bet of betByUser) {
    if (bet.amount.tzapi < 0 || bet.amount.nicu < 0) {
      losers.push({
        ...bet,
        loss: {
          ...bet.loss,
          tzapi: Math.abs(bet.amount.tzapi),
          nicu: Math.abs(bet.amount.nicu),
        },
      });
      continue;
    }

    winners.push({ ...bet, winnings: bet.amount });
  }

  return { winners, losers };
}

export function createResultEmbed(
  game: Match,
  updatedWinners: WinnerBetingUser[],
  updatedLosers: LoserBetingUser[]
) {
  const fieldsWinners: RestOrArray<APIEmbedField> = [
    { name: "Winners :star_struck:", value: "Nice job bois" },
    ...updatedWinners.map((winner) => ({
      name: `\u200b`,
      value: `<@${winner.updatedUser.discordId}> won ${
        winner.winnings.nicu ? winner.winnings.nicu.toString() + " Nicu" : ""
      } ${
        winner.winnings.tzapi ? winner.winnings.tzapi.toString() + " Tzapi" : ""
      }!`,
    })),
  ];
  const fieldsLosers: RestOrArray<APIEmbedField> = [
    {
      name: "Losers :person_in_manual_wheelchair:",
      value: "Hahahaha git gut",
    },
    ...updatedLosers.map((loser) => ({
      name: `\u200b`,
      value: `<@${loser.updatedUser.discordId}> lost ${
        loser.loss.nicu ? loser.loss.nicu.toString() + " Nicu" : ""
      } ${loser.loss.tzapi ? loser.loss.tzapi.toString() + " Tzapi" : ""}!`,
    })),
  ];

  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("League Bets :coin:")
    .setDescription(`The bet on \`${game.player}\`'s match has resolved.`)
    .addFields(
      { name: "Total Bets Placed", value: `${game.bets.length}` },
      { name: "\u200b", value: "\u200b" },
      ...fieldsWinners,
      { name: "\u200b", value: "\u200b" },
      ...fieldsLosers,
      { name: "\u200b", value: "\u200b" }
    )
    .setTimestamp();
}

export function getCheckFinishedMatchButton(
  summonerPUUID: string,
  matchId: string
) {
  const encodedSummonerPUUIDAndMatchId = encodeBase1114111(
    summonerPUUID + "@" + matchId
  );
  const customId = `show-finished-match${encodedSummonerPUUIDAndMatchId}`;
  return new ButtonBuilder()
    .setLabel("Show Match Result")
    .setCustomId(customId)
    .setStyle(ButtonStyle.Primary);
}

export function colorByWinrate(winrate: number) {
  if (winrate < 30) {
    // Red
    return "#B71C1C";
  }
  if (winrate < 50) {
    // Gray
    return "#838383";
  }
  if (winrate < 60) {
    // Green
    return "#43A047";
  }
  if (winrate < 70) {
    // Blue
    return "#1E88E5";
  }

  // Orange
  return "#FB8C00";
}

export function colorByKDA(winrate: number) {
  if (winrate < 1) {
    // Red
    return "#B71C1C";
  }
  if (winrate < 2) {
    // Gray
    return "#838383";
  }
  if (winrate < 4) {
    // Green
    return "#43A047";
  }
  if (winrate < 6) {
    // Blue
    return "#1E88E5";
  }

  // Orange
  return "#FB8C00";
}

export function getChampionSrc(id: number) {
  const champion = champions.find((c) => c.id === id);
  const imagePath = `src/assets/img/champion/${champion?.name}.png`;

  const src = htmlImgSrcFromPath(imagePath);
  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}

export function getSummonerSpellSrc(id: number) {
  const name = summonerSpells[id].id;
  const imagePath = `src/assets/img/spell/${name}.png`;
  const src = htmlImgSrcFromPath(imagePath);

  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}

export function getPerkSrc(id: number) {
  const perk = perks.find((p) => p.id === id);
  const imagePath = `src/assets/img/${perk?.icon}`;

  const src = htmlImgSrcFromPath(imagePath);

  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}

export function getItemSrc(id: number) {
  const imagePath = `src/assets/img/item/${id}.png`;
  const src = htmlImgSrcFromPath(imagePath);

  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}
