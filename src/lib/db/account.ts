import db from "../../data/db.js";
import { Account } from "../types/riot.js";

export function addAccount(account: Account) {
  try {
    const stmt = db.prepare(`
    INSERT INTO accounts
    (summonerPUUID, guildId, gameName, tagLine, region)
    VALUES (?, ?, ?, ?, ?);
    `);

    stmt.run(
      account.summonerPUUID,
      account.guildId,
      account.gameName.toLowerCase(),
      account.tagLine.toLowerCase(),
      account.region
    );

    return { error: undefined };
  } catch (error) {
    return { error: "Account already exists" };
  }
}

export function getAccounts(guildId: string) {
  const stmtUser = db.prepare("SELECT * FROM accounts WHERE guildId = ?");

  const accounts = stmtUser.all(guildId);

  if (!accounts || accounts.length === 0) {
    return { error: "No accounts found", accounts: undefined };
  }

  return {
    error: undefined,
    accounts: accounts as Account[],
  };
}

export function removeAccount(nameAndTag: string, guildId: string) {
  const [gameName, tagLine] = nameAndTag.split("_");
  try {
    const stmt = db.prepare(
      `DELETE FROM accounts WHERE gameName = ? AND tagLine = ? AND guildId = ?;`
    );
    const { changes } = stmt.run(
      gameName.toLowerCase(),
      tagLine.toLowerCase(),
      guildId
    );
    if (changes === 0) {
      return { error: "Account not found" };
    }

    return { error: undefined };
  } catch (error) {
    return { error: "Account not found." };
  }
}
