import {
  APIEmbedField,
  Client,
  EmbedBuilder,
  Events,
  RestOrArray,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import { CHECK_GAME_FINISHED_INTERVAL } from "../constants.js";
import {
  AmountByUser,
  getActiveGames,
  getFinishedMatch,
  handleLoserBetResult,
  handleMatchOutcome,
  handleWinnerBetResult,
  moveFinishedGame,
} from "../utils.js";

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
    const { active, match } = await getFinishedMatch(gameIdWithRegion);
    if (active || !match?.info.endOfGameResult) {
      await setTimeout(1_000);
      continue;
    }

    const participant = match.info.participants.find(
      (p) => p.puuid === summonerPUUID
    );

    if (!participant) {
      await setTimeout(1_000);
      continue;
    }
    console.log("participant found");
    const betByUser = await handleMatchOutcome(game, participant.win);
    console.log("betByUser", betByUser);

    let winners: AmountByUser[] = [];
    let losers: AmountByUser[] = [];
    for (const bet of betByUser) {
      if (bet.amount < 0) {
        losers.push({ ...bet, loss: Math.abs(bet.amount) });
        continue;
      }

      winners.push({ ...bet, winnings: bet.amount });
    }

    console.log("winners", winners);
    console.log("losers", losers);
    const updatedWinners = await handleWinnerBetResult(winners);
    const updatedLosers = await handleLoserBetResult(losers);
    console.log("updatedWinners`", updatedWinners);
    console.log("updatedLosers", updatedLosers);
    const fieldsWinners: RestOrArray<APIEmbedField> = [
      { name: "Winners :star_struck:", value: "Nice job bois" },
      ...updatedWinners.map((winner) => ({
        name: `\u200b`,
        value: `<@${winner.updatedUser.discordId}> won ${winner.winnings} Tzapi!`,
      })),
    ];
    const fieldsLosers: RestOrArray<APIEmbedField> = [
      {
        name: "Losers :person_in_manual_wheelchair:",
        value: "Hahahaha git gut",
      },
      ...updatedLosers.map((loser) => ({
        name: `\u200b`,
        value: `<@${loser.updatedUser.discordId}> lost ${loser.loss} Tzapi!`,
      })),
    ];
    const embedOutcome = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("League Bets :coin:")
      .setDescription(`The bet on \`${game.player}\`'s match has resolved.`)
      .addFields(
        { name: "Total Bets Placed", value: `${game.bets.length}` },
        { name: "\u200b", value: "\u200b" },
        ...fieldsWinners,
        { name: "\u200b", value: "\u200b" },
        ...fieldsLosers,
        { name: "\u200b", value: "\u200b" }
      )
      .setTimestamp();
    try {
      const channel = await client.channels.fetch(game.channelId);
      if (channel?.isSendable()) {
        channel.send({ embeds: [embedOutcome] });
      } else {
        console.log("channel is not sendable");
      }
    } catch (err) {
      console.log(err);
    }

    const { error } = await moveFinishedGame(game, participant.win);
    if (error) {
      console.log("Error moving finished game", error);
    }

    // wait a second
    await setTimeout(1_000);
  }
}
