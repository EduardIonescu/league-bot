import { Region } from "../lib/types/riot.js";

export type User = {
  discordId: string;
  guildId: string;
  lastAction: Date;
  lastRedeemed: Date | undefined;
  timesBet: number;
  wins: number;
  losses: number;
};

export type Currencies = {
  discordId: string;
  type: CurrencyType;
  tzapi: number;
  nicu: number;
};

export type CurrenciesBasic = {
  nicu: number;
  tzapi: number;
};

export type UserAdvanced = User & CurrenciesAdvanced;

export type UserQuerried = {
  discordId: string;
  guildId: string;
  lastAction: Date;
  lastRedeemed: Date | undefined;
  timesBet: number;
  wins: number;
  losses: number;
  balance_nicu: number;
  balance_tzapi: number;
  won_nicu: number;
  won_tzapi: number;
  lost_nicu: number;
  lost_tzapi: number;
};

export type CurrenciesAdvanced = {
  balance: CurrenciesBasic;
  won: CurrenciesBasic;
  lost: CurrenciesBasic;
};

export type CurrencyType = "balance" | "won" | "lost";

export type Match = {
  gameId: number;
  guildId: string;
  player: string;
  gameType: string;
  gameMode: string;
  gameQueueConfigId: number;
  summonerPUUID: string;
  inGameTime: number;
  gameStartTime: number;
  region: Region;
};

export type Bet = {
  discordId: string;
  guildId: string;
  gameId: number;
  win: 0 | 1;
  tzapi?: number;
  nicu?: number;
  timestamp: Date;
};

export type SentInMessage = {
  messageId: string;
  guildId: string;
  channelId: string;
  gameId: number;
};

export type FinishedMatch = {
  gameId: number;
  player: string;
  gameType: string;
  gameMode: string;
  gameQueueConfigId: number;
  summonerPUUID: string;
  inGameTime: number;
  gameStartTime: number;
  region: string;
  gameDuration: number;
  win: 0 | 1;
  remake: boolean | null;
  createdAt?: string;
};

export type FinishedMatchParticipant = {
  gameId: number;
  puuid: string;
  kills: number;
  assists: number;
  deaths: number;
  totalDamageDealtToChampions: number;
  teamPosition: string;
  championId: number;
  champLevel: number;
  summoner1Id: number;
  summoner2Id: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks: string;
  gameName: string;
  tagLine: string;
  teamId: number;
  win: 0 | 1;
};
