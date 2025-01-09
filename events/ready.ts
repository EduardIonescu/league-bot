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
  calculateCurrencyOutcome,
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

    let intervalId: NodeJS.Timeout | null;

    intervalId = setInterval(async () => {
      const { games, error } = await getActiveGames();

      if (!games) {
        return;
      }

      for (const game of games) {
        const summonerPUUID = game.summonerId;
        const gameIdWithRegion = `${game.region.toUpperCase()}_${game.gameId}`;
        const { active, match } = await getFinishedMatch(gameIdWithRegion);
        if (!active && match?.info.endOfGameResult) {
          const participant = match.info.participants.find(
            (p) => p.puuid === summonerPUUID
          );
          if (participant) {
            const betByUser = await handleMatchOutcome(game, participant.win);
            const { winners, losers } = calculateCurrencyOutcome(betByUser);
            const updatedWinners = await handleWinnerBetResult(winners);
            const upodatedLosers = await handleLoserBetResult(losers);

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
              ...upodatedLosers.map((loser) => ({
                name: `\u200b`,
                value: `<@${loser.updatedUser.discordId}> lost ${loser.loss} Tzapi!`,
              })),
            ];
            const embedOutcome = new EmbedBuilder()
              .setColor(0x0099ff)
              .setTitle("League Bets :coin:")
              .setDescription(
                `The bet on \`${game.player}\`'s match has resolved.`
              )
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
          }
        }
        // wait a second
        await setTimeout(1_000);
      }
    }, CHECK_GAME_FINISHED_INTERVAL * 1_000);
  },
};
