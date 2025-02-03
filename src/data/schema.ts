import { Region } from "../lib/types/riot.js";

export type User = {
  discordId: string;
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

export type CurrenciesAdvanced = {
  balance: CurrenciesBasic;
  won: CurrenciesBasic;
  lost: CurrenciesBasic;
};

export type CurrencyType = "balance" | "won" | "lost";

export type Match = {
  gameId: number;
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
  gameId: number;
  win: boolean;
  tzapi?: number;
  nicu?: number;
};

export type SentInMessage = {
  messageId: string;
  channelId: string;
  gameId: number;
};
