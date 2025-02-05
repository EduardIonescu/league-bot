import db from "../../data/db.js";
import {
  Currencies,
  CurrencyType,
  User,
  UserAdvanced,
} from "../../data/schema.js";
import { ZERO_CURRENCIES } from "../constants.js";
import { dateToTIMESTAMP } from "../utils/common.js";

const DEFAULT_USER = {
  balance: {
    tzapi: 100,
    nicu: 0,
  },
  won: ZERO_CURRENCIES,
  lost: ZERO_CURRENCIES,
};

export function addUser(discordId: string) {
  try {
    const stmt = db.prepare(`
    INSERT INTO users
    (discordId, lastAction)
    VALUES (?, ?);
    `);

    stmt.run(discordId, dateToTIMESTAMP(new Date()));
    addDefaultCurrencies(discordId);

    return { error: undefined };
  } catch (error) {
    return { error: "User already exists" };
  }
}

function addDefaultCurrencies(discordId: string) {
  const stmt2 = db.prepare(`
    INSERT INTO user_currencies
    (discordId, type, tzapi)
    VALUES(?, ?, ?);
    `);

  stmt2.run(discordId, "balance", DEFAULT_USER.balance.tzapi);
  stmt2.run(discordId, "won", DEFAULT_USER.won.tzapi);
  stmt2.run(discordId, "lost", DEFAULT_USER.lost.tzapi);
}

export function getUser(discordId: string) {
  const stmtUser = db.prepare("SELECT * FROM users WHERE discordId = ?");

  const user = stmtUser.get(discordId);
  const currencies = getCurrencies(discordId);

  if (!user || !currencies) {
    return { error: "User not found", user: undefined };
  }

  return {
    error: undefined,
    user: { ...(user as User), ...currencies } as UserAdvanced,
  };
}

function getCurrencies(discordId: string) {
  const stmtCurrency = db.prepare(
    "SELECT * FROM user_currencies WHERE discordId = ?"
  );
  const currencies = stmtCurrency.all(discordId);

  if (!currencies) {
    return undefined;
  }

  const formattedCurrencies = (currencies as Currencies[]).reduce(
    (acc, cur) => {
      acc[cur.type] = { tzapi: cur.tzapi, nicu: cur.nicu };
      return acc;
    },
    {} as { [key in CurrencyType]: { tzapi: number; nicu: number } }
  );

  return formattedCurrencies;
}

export function updateUser(user: UserAdvanced) {
  try {
    const stmt = db.prepare(`
    UPDATE users SET
    lastAction = ?, 
    lastRedeemed = ?, 
    timesBet = ?, 
    wins = ?, 
    losses = ?
    WHERE discordId = ?;
    `);

    stmt.run(
      dateToTIMESTAMP(new Date()),
      dateToTIMESTAMP(user.lastRedeemed),
      user.timesBet,
      user.wins,
      user.losses,
      user.discordId
    );
    updateCurrencies(user);

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "An error occured updating the user" };
  }
}

function updateCurrencies(user: UserAdvanced) {
  const stmt = db.prepare(`
    UPDATE user_currencies SET
    tzapi = ?,
    nicu = ?
    WHERE discordId = ? AND type = ?;
    `);

  stmt.run(user.balance.tzapi, user.balance.nicu, user.discordId, "balance");
  stmt.run(user.won.tzapi, user.won.nicu, user.discordId, "won");
  stmt.run(user.lost.tzapi, user.lost.nicu, user.discordId, "lost");
}

export function removeUser(discordId: string) {
  try {
    const stmt = db.prepare("DELETE FROM users WHERE discordId = ?");
    stmt.run(discordId);

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "An error occured removing the user" };
  }
}
