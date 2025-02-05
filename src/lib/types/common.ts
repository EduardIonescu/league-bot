import { UserAdvanced } from "../../data/schema.js";
import { Account, SpectatorParticipant } from "./riot.js";

export type RefundedBettingUser = {
  updatedUser: UserAdvanced;
  refund: Currencies;
};
export type LoserBetingUser = { updatedUser: UserAdvanced; loss: Currencies };
export type WinnerBetingUser = {
  updatedUser: UserAdvanced;
  winnings: Currencies;
};
export type Currencies = { tzapi: number; nicu: number };
export type Currency = "nicu" | "tzapi";

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

export type HTMLString = `<!DOCTYPE html>${string}`;

export type AccountInGame = Account & {
  gameStartTime: number;
  participants: SpectatorParticipant[];
  gameMode: string;
};
