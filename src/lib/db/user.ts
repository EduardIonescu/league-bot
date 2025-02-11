import db from "../../data/db.js";
import {
  Currencies,
  CurrencyType,
  User,
  UserAdvanced,
  UserQuerried,
} from "../../data/schema.js";
import { DEFAULT_USER } from "../constants.js";
import { dateToTIMESTAMP } from "../utils/common.js";

export function addUser(discordId: string, guildId: string) {
  try {
    const stmt = db.prepare(`
    INSERT INTO users
    (discordId, guildId)
    VALUES (?, ?);
    `);

    stmt.run(discordId, guildId);
    addDefaultCurrencies(discordId, guildId);
    return { error: undefined };
  } catch (error) {
    return { error: "User already exists" };
  }
}

function addDefaultCurrencies(discordId: string, guildId: string) {
  const stmt2 = db.prepare(`
    INSERT INTO user_currencies
    (discordId, guildId, type, tzapi)
    VALUES(?, ?, ?, ?);
    `);

  stmt2.run(discordId, guildId, "balance", DEFAULT_USER.balance.tzapi);
  stmt2.run(discordId, guildId, "won", DEFAULT_USER.won.tzapi);
  stmt2.run(discordId, guildId, "lost", DEFAULT_USER.lost.tzapi);
}

export function getUser(discordId: string, guildId: string) {
  try {
    console.log("guildId", guildId);
    const stmtUser = db.prepare(
      "SELECT * FROM users WHERE discordId = ? AND guildId = ?;"
    );

    const user = stmtUser.get(discordId, guildId);
    const currencies = getCurrencies(discordId, guildId);

    if (!user || !currencies) {
      return { error: "User not found", user: undefined };
    }

    return {
      error: undefined,
      user: { ...(user as User), ...currencies } as UserAdvanced,
    };
  } catch (error) {
    return {
      error: "User not found",
      user: undefined,
    };
  }
}

export function getOrAddUserIfAbsent(discordId: string, guildId: string) {
  try {
    console.log("0");
    const { error, user } = getUser(discordId, guildId);
    console.log("user", user);
    if (error || !user) {
      addUser(discordId, guildId);
      const { error: error2, user: user2 } = getUser(discordId, guildId);

      if (error2 || !user2) {
        return { error: error2, user: undefined };
      }
      return { error: undefined, user: user2 };
    }

    return { error: undefined, user };
  } catch (error) {
    return {
      error: "User not found",
      user: undefined,
    };
  }
}

function getCurrencies(discordId: string, guildId: string) {
  const stmtCurrency = db.prepare(
    "SELECT * FROM user_currencies WHERE discordId = ? AND guildId = ?"
  );
  const currencies = stmtCurrency.all(discordId, guildId);

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

export function getAllUsers(guildId: string) {
  const stmtUser = db.prepare(`
    SELECT
      u.discordId,
      u.guildId,
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
      user_currencies AS l ON u.discordId = l.discordId AND l.type = 'lost'
    WHERE u.guildId = ?;
`);

  const rows = stmtUser.all(guildId) as UserQuerried[] | undefined;

  if (!rows) {
    return { error: "No user was found", user: undefined };
  }

  const users = rows.map((row) => ({
    discordId: row.discordId,
    guildId: row.guildId,
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
    WHERE discordId = ? && guildId;
    `);

    stmt.run(
      dateToTIMESTAMP(new Date()),
      dateToTIMESTAMP(user.lastRedeemed),
      user.timesBet,
      user.wins,
      user.losses,
      user.discordId,
      user.guildId
    );
    updateCurrencies(user);

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "An error occured updating the user" };
  }
}

function updateCurrencies(user: UserAdvanced) {
  const { discordId, guildId, balance, won, lost } = user;
  const stmt = db.prepare(`
    UPDATE user_currencies SET
    tzapi = ?,
    nicu = ?
    WHERE discordId = ? AND type = ? AND guildId = ?;
    `);

  stmt.run(balance.tzapi, balance.nicu, discordId, "balance", guildId);
  stmt.run(won.tzapi, won.nicu, discordId, "won", guildId);
  stmt.run(lost.tzapi, lost.nicu, discordId, "lost", guildId);
}

export function removeUser(discordId: string, guildId: string) {
  try {
    const stmt = db.prepare(
      "DELETE FROM users WHERE discordId = ? AND guildId = ?"
    );
    stmt.run(discordId, guildId);

    return { error: undefined };
  } catch (error) {
    console.log(error);
    return { error: "An error occured removing the user" };
  }
}
