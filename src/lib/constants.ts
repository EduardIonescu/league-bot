import { Currencies } from "./types/common";

export const winButtons = [
  { customId: "win-1", label: "1 Tzapi", amount: 1 },
  { customId: "win-10", label: "10 Tzapi", amount: 10 },
  { customId: "win-100", label: "100 Tzapi", amount: 100 },
  { customId: "win-1-nicu", label: "1 Nicu", amount: 1 },
  { customId: "win-10-nicu", label: "10 Nicu", amount: 10 },
  // { customId: "win-custom", label: "Bet Custom" },
];

export const loseButtons = [
  { customId: "lose-1", label: "1 Tzapi", amount: 1 },
  { customId: "lose-10", label: "10 Tzapi", amount: 10 },
  { customId: "lose-100", label: "100 Tzapi", amount: 100 },
  { customId: "lose-1-nicu", label: "1 Nicu", amount: 1 },
  { customId: "lose-10-nicu", label: "10 Nicu", amount: 10 },
  // { customId: "lose-custom", label: "Bet Custom" },
];

export const ZERO_CURRENCIES: Currencies = { tzapi: 0, nicu: 0 };
export const DEFAULT_USER = {
  currency: { tzapi: 100, nicu: 0 },
  data: {
    currencyInActiveBets: [],
    timesBet: 0,
    wins: 0,
    loses: 0,
    currencyWon: ZERO_CURRENCIES,
    currencyLost: ZERO_CURRENCIES,
  },
};

/** The game length at which games should not be available anymore in MINUTES */
export const BETS_CLOSE_AT_GAME_LENGTH = 4;

/** When a match should be considered a remake in MINUTES */
export const REMAKE_GAME_LENGTH_CAP = 10;

/** Check if an active game has ended every n seconds */
export const CHECK_GAME_FINISHED_INTERVAL = 30;

/** For currency exchange */
export const NICU_IN_TZAPI = 1000;

export const BLUE_TEAM_ID = 100;

/** Default image if src not found so they don't break the UI  */
export const IMAGE_NOT_FOUND = `src/assets/img/not-found.webp`;

/** The user is broke if less than this amount of Tzapi  */
export const BROKE_THRESHOLD = 20;
export const TZAPI_TO_GIVE_WHEN_BROKE = 100;
export const BROKE_COOLDOWN = 3;
