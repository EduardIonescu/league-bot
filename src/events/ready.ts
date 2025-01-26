import {
  APIEmbedField,
  Client,
  EmbedBuilder,
  Events,
  RestOrArray,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import {
  CHECK_GAME_FINISHED_INTERVAL,
  REMAKE_GAME_LENGTH_CAP,
} from "../lib/constants.js";
import { AmountByUser } from "../lib/types/common.js";
import {
  getActiveGames,
  handleLoserBetResult,
  handleMatchOutcome,
  handleRemake,
  handleWinnerBetResult,
  moveFinishedGame,
  refundUsers,
} from "../lib/utils/game.js";
import { getFinishedMatch } from "../lib/utils/riot.js";

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
    if (active || !match?.info?.endOfGameResult) {
      await setTimeout(1_000);
      continue;
    }

    // Handle Remake
    if (match.info.gameDuration < REMAKE_GAME_LENGTH_CAP * 60) {
      const betByUser = await handleRemake(game);

      const updatedUsers = await refundUsers(betByUser);

      const usersFields: RestOrArray<APIEmbedField> = [
        { name: "Refunds :triumph:", value: `\u200b` },
        ...updatedUsers.map((user) => {
          const { tzapi, nicu } = user.refund;
          const tzapiMsg = tzapi ? `${tzapi} Tzapi` : "";
          const nicuMsg = nicu ? `${nicu} Nicu ` : "";
          return {
            name: `\u200b`,
            value: `<@${user.updatedUser.discordId}> was refunded ${nicuMsg}${tzapiMsg}!`,
          };
        }),
      ];

      const embedOutcome = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("League Bets :coin:")
        .setDescription(
          `The bet on \`${game.player}\`'s match has resolved. It was a remake`
        )
        .addFields(
          { name: "Total Bets Placed", value: `${game.bets.length}` },
          { name: "\u200b", value: "\u200b" },
          ...usersFields,
          { name: "\u200b", value: "\u200b" }
        )
        .setTimestamp();

      for (const sentIn of game.sentIn) {
        try {
          const channel = await client.channels.fetch(sentIn.channelId);
          if (channel?.isSendable()) {
            channel.send({ embeds: [embedOutcome] });
          } else {
            console.log("channel is not sendable");
          }
        } catch (err) {
          console.log("error sending message", err);
        }
      }

      const { error } = await moveFinishedGame(game, "remake");
      if (error) {
        console.log("Error moving finished game", error);
      }
      console.log("refund done");

      // wait a second
      await setTimeout(1_000);
      continue;
    }

    // Handle win and lose
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
      if (bet.amount.tzapi < 0 || bet.amount.nicu < 0) {
        losers.push({
          ...bet,
          loss: {
            ...bet.loss,
            tzapi: Math.abs(bet.amount.tzapi),
            nicu: Math.abs(bet.amount.nicu),
          },
        });
        continue;
      }

      winners.push({ ...bet, winnings: bet.amount });
    }

    const updatedWinners = await handleWinnerBetResult(winners);
    const updatedLosers = await handleLoserBetResult(losers);

    const fieldsWinners: RestOrArray<APIEmbedField> = [
      { name: "Winners :star_struck:", value: "Nice job bois" },
      ...updatedWinners.map((winner) => {
        const { tzapi, nicu } = winner.winnings;
        const tzapiMsg = tzapi ? `${tzapi} Tzapi` : "";
        const nicuMsg = nicu ? `${nicu} Nicu ` : "";
        return {
          name: `\u200b`,
          value: `<@${winner.updatedUser.discordId}> won ${nicuMsg}${tzapiMsg}!`,
        };
      }),
    ];
    const fieldsLosers: RestOrArray<APIEmbedField> = [
      {
        name: "Losers :person_in_manual_wheelchair:",
        value: "Hahahaha git gut",
      },
      ...updatedLosers.map((loser) => {
        const { tzapi, nicu } = loser.loss;
        const tzapiMsg = tzapi ? `${tzapi} Tzapi` : "";
        const nicuMsg = nicu ? `${nicu} Nicu ` : "";

        return {
          name: `\u200b`,
          value: `<@${loser.updatedUser.discordId}> lost ${nicuMsg}${tzapiMsg}!`,
        };
      }),
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

    for (const sentIn of game.sentIn) {
      try {
        const channel = await client.channels.fetch(sentIn.channelId);
        if (channel?.isSendable()) {
          channel.send({ embeds: [embedOutcome] });
        } else {
          console.log("channel is not sendable");
        }
      } catch (err) {
        console.log("error sending message", err);
      }
    }

    const { error } = await moveFinishedGame(game, participant.win);
    if (error) {
      console.log("Error moving finished game", error);
    }

    // wait a second
    await setTimeout(1_000);
  }
}
