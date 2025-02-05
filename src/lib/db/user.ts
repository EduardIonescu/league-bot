import db from "../../data/db.js";
import {
  Currencies,
  CurrencyType,
  User,
  UserAdvanced,
  UserQuerried,
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

export function getAllUsers() {
  const stmtUser = db.prepare(`
    SELECT
      u.discordId,
      u.lastAction,
      u.lastRedeemed,
      u.timesBet,
      u.wins,
      u.losses,
      b.nicu AS balance_nicu,
      b.tzapi AS balance_tzapi,
      w.nicu AS won_nicu,
      w.tzapi AS won_tzapi,
      l.nicu AS lost_nicu,
      l.tzapi AS lost_tzapi
    FROM
      users AS u
    LEFT JOIN
      user_currencies AS b ON u.discordId = b.discordId AND b.type = 'balance'
    LEFT JOIN
      user_currencies AS w ON u.discordId = w.discordId AND w.type = 'won'
    LEFT JOIN
      user_currencies AS l ON u.discordId = l.discordId AND l.type = 'lost';
`);

  const rows = stmtUser.all() as UserQuerried[] | undefined;

  if (!rows) {
    return { error: "No user was found", user: undefined };
  }

  const users = rows.map((row) => ({
    discordId: row.discordId,
    lastAction: row.lastAction,
    lastRedeemed: row.lastRedeemed,
    timesBet: row.timesBet,
    wins: row.wins,
    losses: row.losses,
    balance: { nicu: row.balance_nicu || 0, tzapi: row.balance_tzapi || 0 },
    won: { nicu: row.won_nicu || 0, tzapi: row.won_tzapi || 0 },
    lost: { nicu: row.lost_nicu || 0, tzapi: row.lost_tzapi || 0 },
  })) as UserAdvanced[];

  return {
    error: undefined,
    users,
  };
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
