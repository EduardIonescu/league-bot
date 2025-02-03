import db from "../../data/db.js";
import { Account } from "../types/riot.js";

export function addAccount(account: Account) {
  try {
    const stmt = db.prepare(`
    INSERT INTO accounts
    (summonerPUUID, gameName, tagLine, region)
    VALUES (?, ?, ?, ?);
    `);

    stmt.run(
      account.summonerPUUID,
      account.gameName.toLowerCase(),
      account.tagLine.toLowerCase(),
      account.region
    );

    return { error: undefined };
  } catch (error) {
    return { error: "Account already exists" };
  }
}

export function getAccounts() {
  const stmtUser = db.prepare("SELECT * FROM accounts");

  const accounts = stmtUser.all();

  if (!accounts || accounts.length === 0) {
    return { error: "No accounts found", accounts: undefined };
  }

  return {
    error: undefined,
    accounts: accounts as Account[],
  };
}

export function removeAccount(nameAndTag: string) {
  const [gameName, tagLine] = nameAndTag.split("_");
  try {
    const stmt = db.prepare(
      `DELETE FROM accounts WHERE gameName = ? AND tagLine = ?;`
    );
    const { changes } = stmt.run(gameName.toLowerCase(), tagLine.toLowerCase());
    if (changes === 0) {
      return { error: "Account not found" };
    }

    return { error: undefined };
  } catch (error) {
    return { error: "Account not found." };
  }
}
