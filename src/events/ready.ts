import { ActionRowBuilder, ButtonBuilder, Client, Events } from "discord.js";
import { setTimeout } from "node:timers/promises";
import {
  CHECK_GAME_FINISHED_INTERVAL,
  REMAKE_GAME_LENGTH_CAP,
} from "../lib/constants.js";
import { getCheckButton } from "../lib/utils/check.js";
import {
  createRemakeEmbed,
  createResultEmbed,
  getActiveGames,
  getCheckFinishedMatchButton,
  handleLoserBetResult,
  handleMatchOutcome,
  handleRemake,
  handleWinnerBetResult,
  moveFinishedGame,
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
  const { games, error } = await getActiveGames();

  if (!games) {
    return;
  }

  for (const game of games) {
    const summonerPUUID = game.summonerId;
    const gameIdWithRegion = `${game.region.toUpperCase()}_${game.gameId}`;
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

    // Handle Remake
    if (matchResult.info.gameDuration < REMAKE_GAME_LENGTH_CAP * 60) {
      const betByUser = await handleRemake(game);
      const updatedUsers = await refundUsers(betByUser);

      const embedOutcome = createRemakeEmbed(game, updatedUsers);
      await sendEmbedToChannels(client, game.sentIn, embedOutcome, [
        components,
      ]);

      const { error } = await moveFinishedGame(game, matchResult, "remake");
      if (error) {
        console.log("Error moving finished game", error);
      }

      // wait a second
      await setTimeout(1_000);
      continue;
    }

    // Handle win and lose
    const participant = matchResult.info.participants.find(
      (p) => p.puuid === summonerPUUID
    );

    if (!participant) {
      await setTimeout(1_000);
      continue;
    }
    const betByUser = await handleMatchOutcome(game, participant.win);
    const { winners, losers } = splitBets(betByUser);

    const updatedWinners = await handleWinnerBetResult(winners);
    const updatedLosers = await handleLoserBetResult(losers);

    const embedOutcome = createResultEmbed(game, updatedWinners, updatedLosers);

    await sendEmbedToChannels(client, game.sentIn, embedOutcome, [components]);

    const { error } = await moveFinishedGame(
      game,
      matchResult,
      participant.win
    );
    if (error) {
      console.log("Error moving finished game", error);
    }

    // wait a second
    await setTimeout(1_000);
  }
}
