import { getAccounts } from "../db/account.js";
import { Account } from "../types/riot.js";

const accountsCache = new Map<string, Account[]>();

export function getAndCacheAccounts(guildId: string) {
  const cachedAccounts = accountsCache.get(guildId);

  if (cachedAccounts && cachedAccounts.length > 0) {
    return { error: undefined, accounts: cachedAccounts };
  }

  const { error, accounts } = getAccounts(guildId);
  if (error || !accounts) {
    return { error, accounts: undefined };
  }

  accountsCache.set(guildId, accounts);
  return { error: undefined, accounts };
}

export function removeCachedAccount(nameAndTag: string, guildId: string) {
  const [gameName, tagLine] = nameAndTag.split("_");
  const accounts = accountsCache.get(guildId);
  if (!accounts) {
    return;
  }

  accountsCache.set(
    guildId,
    accounts.filter(
      (account) => account.gameName !== gameName && account.tagLine !== tagLine
    )
  );
}
