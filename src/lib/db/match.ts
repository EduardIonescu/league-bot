import db from "../../data/db.js";
import { Bet, Match, SentInMessage } from "../../data/schema.js";
import { FinishedMatchParticipant } from "../types/common.js";
import { MatchResult } from "../types/riot.js";
import { dateToTIMESTAMP } from "../utils/common.js";

export function addActiveMatch(match: Match) {
  try {
    const stmt = db.prepare(`
        INSERT INTO activeMatches
        (gameId, player, gameType, gameMode, gameQueueConfigId, summonerPUUID, inGameTime, gameStartTime, region)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `);

    stmt.run(
      match.gameId,
      match.player,
      match.gameType,
      match.gameMode,
      match.gameQueueConfigId,
      match.summonerPUUID,
      match.inGameTime,
      match.gameStartTime,
      match.region
    );

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "Failed to add match" };
  }
}

export function addMessage(message: SentInMessage) {
  try {
    const stmt = db.prepare(`
        INSERT INTO messages
        (messageId, channelId, gameId)
        VALUES (?, ?, ?);
      `);

    stmt.run(message.messageId, message.channelId, message.gameId);

    return { error: undefined };
  } catch (error) {
    console.log(error);

    return { error: "Failed to save message" };
  }
}

export function addBet(bet: Bet) {
  try {
    const stmt = db.prepare(`
        INSERT INTO bets
        (discordId, gameId, win, tzapi, nicu, timestamp)
        VALUES (?, ?, ?, ?, ?, ?);
      `);

    stmt.run(
      bet.discordId,
      bet.gameId,
      bet.win ? 1 : 0,
      bet.tzapi ?? null,
      bet.nicu ?? null,
      dateToTIMESTAMP(new Date())
    );

    return { error: undefined };
  } catch (error) {
    console.log(error);

    return { error: "Failed to add bet" };
  }
}

export function getActiveMatch(summonerPUUID: string) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM activeMatches WHERE summonerPUUID = ?;
  `);

    const match = stmt.get(summonerPUUID) as Match | undefined;

    if (!match) {
      return {
        error: "Live match not found.",
        match: undefined,
        bets: undefined,
        messages: undefined,
      };
    }

    const { bets } = getBets(match.gameId);
    const { messages } = getMessages(match.gameId);

    return { error: undefined, match, messages, bets };
  } catch (error) {
    console.log(error);
    return {
      error: "Live match not found.",
      match: undefined,
      bets: undefined,
      messages: undefined,
    };
  }
}

function getBets(gameId: number) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM bets WHERE gameId = ?;
      `);

    const bets = stmt.all(gameId) as Bet[];

    return { error: undefined, bets };
  } catch (error) {
    console.log(error);
    return { error: true, bets: undefined };
  }
}

function getMessages(gameId: number) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM messages WHERE gameId = ?;
      `);

    const messages = stmt.all(gameId) as SentInMessage[];

    return { error: undefined, messages };
  } catch (error) {
    console.log(error);
    return { error: true, messages: undefined };
  }
}

export function removeActiveGame(gameId: number) {
  try {
    const stmt = db.prepare(`
    DELETE FROM activeMatches WHERE gameId = ?;
    `);

    stmt.run(gameId);

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "Account not found." };
  }
}

export function addFinishedMatch(
  match: Match,
  matchResult: MatchResult,
  win: boolean,
  remake: boolean
) {
  try {
    const stmt = db.prepare(`
    INSERT INTO finishedMatches (
      gameId,
      player,
      gameType,
      gameMode,
      gameQueueConfigId,
      summonerPUUID,
      inGameTime,
      gameStartTime,
      region,
      gameDuration,
      win,
      remake
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

    stmt.run(
      match.gameId,
      match.player,
      match.gameType,
      match.gameMode,
      match.gameQueueConfigId,
      match.summonerPUUID,
      match.inGameTime,
      match.gameStartTime,
      match.region,
      matchResult.info.gameDuration,
      win ? 1 : 0,
      remake ? 1 : 0
    );

    for (const participant of matchResult.info.participants) {
      const { error } = addFinishedMatchParticipants(participant, match.gameId);

      if (error) {
        return { error };
      }
    }

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "Failed to add finished match" };
  }
}

function addFinishedMatchParticipants(
  participant: FinishedMatchParticipant,
  gameId: number
) {
  try {
    const stmt = db.prepare(`
      INSERT INTO finishedMatchParticipants (
        gameId, 
        puuid, 
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
        neutralMinionsKilled, 
        item0, 
        item1, 
        item2, 
        item3,
        item4, 
        item5, 
        item6, 
        perks, 
        riotIdGameName,
        riotIdTagline, 
        teamId, 
        win
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      gameId,
      participant.puuid,
      participant.kills,
      participant.assists,
      participant.deaths,
      participant.totalDamageDealtToChampions,
      participant.teamPosition,
      participant.championId,
      participant.champLevel,
      participant.summoner1Id,
      participant.summoner2Id,
      participant.totalMinionsKilled,
      participant.neutralMinionsKilled,
      participant.item0,
      participant.item1,
      participant.item2,
      participant.item3,
      participant.item4,
      participant.item5,
      participant.item6,
      JSON.stringify(participant.perks),
      participant.riotIdGameName,
      participant.riotIdTagline,
      participant.teamId,
      participant.win ? 1 : 0
    );

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "Failed to add participant" };
  }
}

export function getFinishedMatch(gameId: number) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM finishedMatches WHERE gameId = ?;
      `);

    const finishedMatch = stmt.get(gameId);
    const { finishedMatchParticipants } = getFinishedMatchParticipants(gameId);

    return { error: undefined, finishedMatch, finishedMatchParticipants };
  } catch (error) {
    console.log(error);
    return {
      error: true,
      finishedMatch: undefined,
      finishedMatchParticipants: undefined,
    };
  }
}
function getFinishedMatchParticipants(gameId: number) {
  try {
    const stmt = db.prepare(`
      SELECT puuid, perks FROM finishedMatchParticipants WHERE gameId = ?;
      `);

    const finishedMatchParticipants = stmt.all(gameId);

    return { error: undefined, finishedMatchParticipants };
  } catch (error) {
    console.log(error);
    return { error: true, finishedMatchParticipants: undefined };
  }
}
