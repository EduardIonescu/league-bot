import { Perks, Region } from "./riot";

export type BettingUser = {
  discordId: string;
  currency: Currencies;
  timestamp: { lastAction: Date; lastRedeemed: Date | undefined };
  data: {
    timesBet: number;
    wins: number;
    loses: number;
    currencyWon: Currencies;
    currencyLost: Currencies;
  };
};
export type RefundedBettingUser = {
  updatedUser: BettingUser;
  refund: Currencies;
};
export type LoserBetingUser = { updatedUser: BettingUser; loss: Currencies };
export type WinnerBetingUser = {
  updatedUser: BettingUser;
  winnings: Currencies;
};
export type Currencies = { tzapi: number; nicu: number };
export type Currency = "nicu" | "tzapi";

export type Bet = {
  discordId: string;
  amount: Currencies;
  win: boolean;
  timestamp: Date;
  inGameTime: number;
};

export type SentIn = { channelId: string; messageIds: string[] }[];
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
  sentIn: SentIn;
  againstBot: boolean;
  bets: Bet[];
};

export type FinishedMatch = Match & {
  win: boolean | "remake";
  participants: FinishedMatchParticipant[];
  gameDuration: number;
};

export type AmountByUser = {
  discordId: string;
  amount: Currencies;
  winnings?: Currencies;
  loss?: Currencies;
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

export type FinishedMatchParticipant = {
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
  // Jungle monsters + epic camps etc
  neutralMinionsKilled: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks: Perks;
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  teamId: number;
  win: boolean;
};

export type HTMLString = `<!DOCTYPE html>${string}`;
