export const winButtons = [
  { customId: "win-1", label: "Bet 1", amount: 1 },
  { customId: "win-10", label: "Bet 10", amount: 10 },
  { customId: "win-100", label: "Bet 100", amount: 100 },
  { customId: "win-custom", label: "Bet Custom" },
];

export const loseButtons = [
  { customId: "lose-1", label: "Bet 1", amount: 1 },
  { customId: "lose-10", label: "Bet 10", amount: 10 },
  { customId: "lose-100", label: "Bet 100", amount: 100 },
  { customId: "lose-custom", label: "Bet Custom" },
];

export const DEFAULT_USER = {
  currency: 100,
  data: {
    currencyInActiveBets: [],
    timesBet: 0,
    wins: 0,
    loses: 0,
    currencyWon: 0,
    currencyLost: 0,
  },
};
