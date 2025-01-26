import * as dotenv from "dotenv";
import {
  AccountData,
  FailedRequest,
  MatchResult,
  Region,
  RegionRiot,
  SpectatorData,
  SummonerId,
} from "../types/riot";

dotenv.config();

const headers = {
  "X-Riot-Token": process.env.LEAGUE_API ?? "",
};

export async function getSummonerId(name: string, tag: string) {
  const endpoint =
    "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id";
  const url = `${endpoint}/${name}/${tag}`;

  try {
    const response = await fetch(url, { headers });

    const summonerId = (await response.json()) as SummonerId;

    return summonerId;
  } catch (err) {
    console.error(err);
    return;
  }
}

export async function getSpectatorData(summonerPUUID: string, region: Region) {
  const endpoint = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner`;
  const url = `${endpoint}/${summonerPUUID}`;

  try {
    const response = await fetch(url, { headers });

    const spectatorData: FailedRequest | SpectatorData = await response.json();
    return spectatorData;
  } catch (err) {
    console.error(err);
    return;
  }
}

/** @param matchId is for example `NA1_5201383209`. It needs the region prefix */
export async function getFinishedMatch(
  matchId: string,
  region: RegionRiot = "europe"
) {
  const endpoint = `https://${region}.api.riotgames.com/lol/match/v5/matches`;
  const url = `${endpoint}/${matchId.toUpperCase()}`;
  try {
    const response = await fetch(url, { headers });

    const match = (await response.json()) as FailedRequest | MatchResult;

    if (!match || ("status" in match && match.status.status_code)) {
      return { active: true, match: undefined };
    }

    return { active: false, match: match as MatchResult };
  } catch (err) {
    console.log(err);
    return { active: false, match: undefined };
  }
}

/** It needs the `summonerId`, not to be confused with summonerPUUID  */
export async function getAccountData(summonerId: string, region: Region) {
  const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
  try {
    const response = await fetch(url, { headers });
    const account = (await response.json()) as FailedRequest | AccountData[];

    if (!account || typeof account === "string" || "status" in account) {
      return { error: "Failed to fetch", account: undefined };
    }

    return { error: undefined, account };
  } catch (err) {
    console.log(err);
    return { error: "Failed to fetch", account: undefined };
  }
}
