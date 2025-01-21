import { Region } from "./riot";

export type BettingUser = {
  discordId: string;
  currency: Currencies;
  timestamp: Date;
  data: {
    timesBet: number;
    wins: number;
    loses: number;
    currencyWon: number;
    currencyLost: number;
  };
};
export type Currencies = { tzapi: number; nicu: number };
export type Currency = "nicu" | "tzapi";

export type Bet = {
  discordId: string;
  amount: number;
  win: boolean;
  timestamp: Date;
  inGameTime: number;
};

export type Match = {
  gameId: number;
  player: string;
  gameType: string;
  gameMode: string;
  gameQueueConfigId: number;
  summonerId: string;
  inGameTime: number;
  gameStartTime: number;
  region: Region;
  sentIn: { channelId: string; messageIds: string[] }[];
  againstBot: boolean;
  bets: Bet[];
};

export type AmountByUser = {
  discordId: string;
  amount: number;
  winnings?: number;
  loss?: number;
};

export type Choice = { name: string; value: string };

export type Lane = "top" | "jungle" | "mid" | "bot" | "support";
export type Champion = { id: number; name: string; lanes: Lane[] };

export type SummonerSpell = {
  key: number;
  name: string;
  id: string;
  weights: { [key in Lane]?: number };
};
