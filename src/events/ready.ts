import { ActionRowBuilder, ButtonBuilder, Client, Events } from "discord.js";
import { setTimeout } from "node:timers/promises";
import {
  CHECK_GAME_FINISHED_INTERVAL,
  REMAKE_GAME_LENGTH_CAP,
} from "../lib/constants.js";
import {
  addFinishedBets,
  addFinishedMatch,
  getActiveMatches,
  getBets,
  getMessages,
  removeActiveGame,
} from "../lib/db/match.js";
import { getCheckButton } from "../lib/utils/check.js";
import {
  createRemakeEmbed,
  createResultEmbed,
  getCheckFinishedMatchButton,
  handleLoserBetResult,
  handleMatchOutcome,
  handleRemake,
  handleWinnerBetResult,
  refundUsers,
  sendEmbedToChannels,
  splitBets,
} from "../lib/utils/game.js";
import { getLeaderboardButton } from "../lib/utils/leaderboard.js";
import { fetchFinishedMatch } from "../lib/utils/riot.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`Ready! Logged in as ${client?.user?.tag}`);

    setInterval(async () => {
      await handleActiveBets(client);
    }, CHECK_GAME_FINISHED_INTERVAL * 1_000);
  },
};

async function handleActiveBets(client: Client) {
  const { error, matches } = getActiveMatches();
  if (error || !matches) {
    console.log("error", error);
    return;
  }

  for (const match of matches) {
    const summonerPUUID = match.summonerPUUID;
    const gameIdWithRegion = `${match.region.toUpperCase()}_${match.gameId}`;
    const { active, match: matchResult } = await fetchFinishedMatch(
      gameIdWithRegion
    );
    if (active || !matchResult?.info?.endOfGameResult) {
      await setTimeout(1_000);
      continue;
    }

    const components = new ActionRowBuilder<ButtonBuilder>().addComponents(
      getCheckFinishedMatchButton(summonerPUUID, matchResult.metadata.matchId),
      getLeaderboardButton(false),
      getCheckButton(false)
    );

    const { bets } = getBets(match.gameId);
    const { messages } = getMessages(match.gameId);

    const participant = matchResult.info.participants.find(
      (p) => p.puuid === summonerPUUID
    );

    if (!participant) {
      await setTimeout(1_000);
      continue;
    }

    // Handle Remake
    if (matchResult.info.gameDuration < REMAKE_GAME_LENGTH_CAP * 60) {
      if (bets && bets.length > 0) {
        const betByUser = handleRemake(bets);

        const updatedUsers = refundUsers(betByUser);

        const embedOutcome = createRemakeEmbed(match, bets, updatedUsers);
        await sendEmbedToChannels(client, messages ?? [], embedOutcome, [
          components,
        ]);

        const { error } = addFinishedMatch(
          match,
          matchResult,
          participant.win,
          true
        );
        addFinishedBets(bets);

        if (error) {
          console.log("Error moving finished game", error);
        }
      }

      removeActiveGame(match.gameId);

      // wait a second
      await setTimeout(1_000);
      continue;
    }

    // Handle win and lose
    if (bets && bets.length > 0) {
      const betByUser = handleMatchOutcome(bets, participant.win ? 1 : 0);
      const { winners, losers } = splitBets(betByUser);

      const updatedWinners = handleWinnerBetResult(winners);
      const updatedLosers = handleLoserBetResult(losers);

      const embedOutcome = createResultEmbed(
        match,
        bets,
        updatedWinners,
        updatedLosers
      );
      await sendEmbedToChannels(client, messages ?? [], embedOutcome, [
        components,
      ]);

      const { error } = addFinishedMatch(
        match,
        matchResult,
        participant.win,
        false
      );
      addFinishedBets(bets);

      if (error) {
        console.log("Error moving finished game", error);
      }
    }

    removeActiveGame(match.gameId);

    // wait a second
    await setTimeout(1_000);
  }
}
