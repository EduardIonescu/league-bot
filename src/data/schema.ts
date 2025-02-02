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
