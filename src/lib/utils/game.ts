import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  RestOrArray,
} from "discord.js";
import champions from "../../assets/champions.js";
import perks from "../../assets/perks.js";
import summonerSpells from "../../assets/summonerSpells.js";
import { Bet, Match, SentInMessage } from "../../data/schema.js";
import { ParticipantStats } from "../components/spectatorMatch.js";
import {
  BETS_CLOSE_AT_GAME_LENGTH,
  IMAGE_NOT_FOUND,
  loseButtons,
  winButtons,
  ZERO_CURRENCIES,
} from "../constants.js";
import { getUser, updateUser } from "../db/user.js";
import {
  AmountByUser,
  Choice,
  Lane,
  LoserBetingUser,
  RefundedBettingUser,
  WinnerBetingUser,
} from "../types/common.js";
import { Account, SpectatorParticipant } from "../types/riot.js";
import {
  encodeBase1114111,
  htmlImgSrcFromPath,
  toTitleCase,
} from "./common.js";

export function canBetOnActiveGame(gameStartTime: number) {
  const differenceInSeconds = Math.ceil((Date.now() - gameStartTime) / 1_000);

  return differenceInSeconds <= BETS_CLOSE_AT_GAME_LENGTH * 60;
}

export async function handleMatchOutcome(bets: Bet[] | undefined, win: 1 | 0) {
  if (!bets) {
    return [];
  }

  const amountByUser = bets.reduce((acc, cur) => {
    const accumulatedUser = acc.find(
      (user) => user.discordId === cur.discordId
    );
    const outcome = win === cur.win ? 1 : -1;
    const amount = {
      tzapi: (cur.tzapi ?? 0) * outcome,
      nicu: (cur.nicu ?? 0) * outcome,
    };
    if (accumulatedUser) {
      accumulatedUser.amount = {
        tzapi: amount.tzapi + accumulatedUser.amount.tzapi,
        nicu: amount.nicu + accumulatedUser.amount.nicu,
      };
      return acc;
    }
    return [...acc, { discordId: cur.discordId, amount }];
  }, [] as AmountByUser[]);
  return amountByUser;
}

export async function handleRemake(bets: Bet[] | undefined) {
  if (!bets) {
    return [];
  }

  const amountByUser = bets.reduce((acc, cur) => {
    const accumulatedUser = acc.find(
      (user) => user.discordId === cur.discordId
    );
    if (accumulatedUser) {
      accumulatedUser.amount = {
        tzapi: (cur.tzapi ?? 0) + accumulatedUser.amount.tzapi,
        nicu: (cur.nicu ?? 0) + accumulatedUser.amount.nicu,
      };
      return acc;
    }
    return [
      ...acc,
      {
        discordId: cur.discordId,
        amount: { tzapi: cur.tzapi ?? 0, nicu: cur.nicu ?? 0 },
      },
    ];
  }, [] as AmountByUser[]);
  return amountByUser;
}

export async function refundUsers(users: AmountByUser[]) {
  if (!users) {
    return [];
  }

  const bettingUsers = users.map(async (user) => {
    const { error: error, user: userDb } = getUser(user.discordId);

    if (error || !userDb) {
      return;
    }

    const tzapi = user.amount.tzapi + userDb.balance.tzapi;
    const nicu = user.amount.nicu + userDb.balance.nicu;

    const balance = { ...userDb.balance, tzapi, nicu };
    const updatedUser = { ...userDb, balance };

    updateUser(updatedUser);

    return { updatedUser, refund: user.amount ?? ZERO_CURRENCIES };
  });

  return (await Promise.all(bettingUsers)).filter((user) => user != undefined);
}

export async function handleWinnerBetResult(users: AmountByUser[]) {
  const winners = users.map(async (user) => {
    const { error, user: userDb } = getUser(user.discordId);

    if (error || !userDb) {
      console.log("error", error);
      return;
    }

    const tzapi =
      user.amount.tzapi + (user.winnings?.tzapi ?? 0) + userDb.balance.tzapi;
    const nicu =
      user.amount.nicu + (user.winnings?.nicu ?? 0) + userDb.balance.nicu;

    const balance = { ...userDb.balance, tzapi, nicu };

    const wins = userDb.wins + 1;
    const won = {
      tzapi: userDb.won.tzapi + (user.winnings?.tzapi ?? 0),
      nicu: userDb.won.nicu + (user.winnings?.nicu ?? 0),
    };

    const updatedUser = { ...userDb, wins, balance, won };

    const { error: errorUpdateDb } = updateUser(updatedUser);
    if (errorUpdateDb) {
      console.log("errorUpdateDb", errorUpdateDb);
    }

    return { updatedUser, winnings: user.winnings ?? ZERO_CURRENCIES };
  });

  return (await Promise.all(winners)).filter((winner) => winner != undefined);
}

export async function handleLoserBetResult(users: AmountByUser[]) {
  const losers = users.map(async (user) => {
    const { error, user: userDb } = getUser(user.discordId);

    if (error || !userDb) {
      return;
    }

    const tzapi =
      userDb.balance.tzapi +
      Math.abs(user.amount.tzapi) -
      (user.loss?.tzapi ?? 0);
    const nicu =
      userDb.balance.nicu + Math.abs(user.amount.nicu) - (user.loss?.nicu ?? 0);

    const balance = { ...userDb.balance, tzapi, nicu };

    const losses = userDb.losses + 1;
    const lost = {
      tzapi: userDb.lost.tzapi + (user.loss?.tzapi ?? 0),
      nicu: userDb.lost.nicu + (user.loss?.nicu ?? 0),
    };

    const updatedUser = { ...userDb, losses, balance, lost };

    const { error: errorUpdate } = updateUser(updatedUser);
    if (errorUpdate) {
      console.log("errorUpdateDb", errorUpdate);
    }

    return { updatedUser, loss: user.loss ?? ZERO_CURRENCIES };
  });

  return (await Promise.all(losers)).filter((loser) => loser != undefined);
}

export function formatChoices(
  accounts: Account[] | undefined,
  valueIsSummonerPUUID: boolean = true
) {
  const choices: Choice[] | undefined = accounts?.map((account) => {
    const nameAndTag = (account.gameName + "_" + account.tagLine).toLowerCase();
    const value = valueIsSummonerPUUID ? account.summonerPUUID : nameAndTag;

    return {
      name: formatPlayerName(account.gameName, account.tagLine),
      value,
    };
  });

  return choices ?? [];
}

/** Returns player name as `Demon#Ikspe`  */
export function formatPlayerName(gameName: string, tagLine: string) {
  return `${toTitleCase(gameName)}#${tagLine.toUpperCase()}`;
}

export function bettingButtons() {
  const winButtonsBuilders = winButtons.map((button) =>
    new ButtonBuilder()
      .setLabel(button.label)
      .setCustomId(button.customId)
      .setStyle(ButtonStyle.Primary)
  );
  const loseButtonsBuilders = loseButtons.map((button) =>
    new ButtonBuilder()
      .setLabel(button.label)
      .setCustomId(button.customId)
      .setStyle(ButtonStyle.Danger)
  );
  const winRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...winButtonsBuilders
  );
  const loseRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...loseButtonsBuilders
  );

  return { winRow, loseRow };
}

export function getTotalBets(bets: Bet[]) {
  const totalBetWin = bets.reduce(
    (acc, cur) => ({
      tzapi: acc.tzapi + (cur.win ? cur.tzapi ?? 0 : 0),
      nicu: acc.nicu + (cur.win ? cur.nicu ?? 0 : 0),
    }),
    ZERO_CURRENCIES
  );
  const totalBetLose = bets.reduce(
    (acc, cur) => ({
      tzapi: acc.tzapi + (cur.win ? 0 : cur.tzapi ?? 0),
      nicu: acc.nicu + (cur.win ? 0 : cur.nicu ?? 0),
    }),

    ZERO_CURRENCIES
  );

  return { totalBetWin, totalBetLose };
}

export function calculateLaneWeights(participant: SpectatorParticipant) {
  const spell1 = summonerSpells[participant.spell1Id];
  const spell2 = summonerSpells[participant.spell2Id];

  const weights: { [key in Lane]: number } = {
    top: 0,
    jungle: 0,
    mid: 0,
    bot: 0,
    support: 0,
  };

  if (spell1.name === "Smite" || spell2.name === "Smite") {
    weights.jungle += 100;
    return weights;
  }

  const champion = champions.find((c) => c.id === participant.championId);

  Object.entries(spell1.weights).forEach(
    ([lane, weight]) => (weights[lane as Lane] += weight)
  );
  Object.entries(spell2.weights).forEach(
    ([lane, weight]) => (weights[lane as Lane] += weight)
  );

  if (champion) {
    // - 0.1 * index so the first lanes have more importance
    champion.lanes.forEach((lane, index) =>
      lane === "support"
        ? (weights[lane] += 0.5 - 0.1 * index)
        : (weights[lane] += 0.3 - 0.1 * index)
    );
  }

  return weights;
}

export function guessTeamLanes(participants: ParticipantStats[]) {
  let top, jungle, mid, bot, support;

  let { participantLane: jungleTemp, newParticipants } = highestWeightLane(
    "jungle",
    participants
  );
  jungle = jungleTemp;

  let { participantLane: supportTemp, newParticipants: newParticipants1 } =
    highestWeightLane("support", newParticipants);
  support = supportTemp;

  let { participantLane: topTemp, newParticipants: newParticipants2 } =
    highestWeightLane("top", newParticipants1);
  top = topTemp;

  let { participantLane: midTemp, newParticipants: newParticipants3 } =
    highestWeightLane("mid", newParticipants2);
  mid = midTemp;

  bot = newParticipants3[0];

  return [top, jungle, mid, bot, support];
}

export function highestWeightLane(
  lane: Lane,
  participants: ParticipantStats[]
) {
  let participantLane: ParticipantStats = participants[0];
  for (const participant of participants) {
    if (
      (participant.weights[lane] ?? 0) > (participantLane.weights[lane] ?? 0)
    ) {
      participantLane = participant;
    }
  }

  const newParticipants = participants.filter(
    (participant) => participant.riotId !== participantLane.riotId
  );

  return { participantLane, newParticipants };
}
export function createRemakeEmbed(
  match: Match,
  bets: Bet[] | undefined,
  updatedUsers: RefundedBettingUser[]
) {
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

  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("League Bets :coin:")
    .setDescription(
      `The bet on \`${match.player}\`'s match has resolved. It was a remake`
    )
    .addFields(
      { name: "Total Bets Placed", value: `${(bets ?? []).length}` },
      { name: "\u200b", value: "\u200b" },
      ...usersFields,
      { name: "\u200b", value: "\u200b" }
    )
    .setTimestamp();
}

export async function sendEmbedToChannels(
  client: Client,
  messages: SentInMessage[],
  embed: EmbedBuilder,
  components: ActionRowBuilder<ButtonBuilder>[] = []
) {
  const uniqueChannelIds = new Set(messages.map((msg) => msg.channelId));
  for (const channelId of uniqueChannelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isSendable()) {
        channel.send({ embeds: [embed], components });
      } else {
        console.log("channel is not sendable");
      }
    } catch (err) {
      console.log("error sending message", err);
    }
  }
}

export function splitBets(betByUser: AmountByUser[]) {
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

  return { winners, losers };
}

export function createResultEmbed(
  game: Match,
  bets: Bet[] | undefined,
  updatedWinners: WinnerBetingUser[],
  updatedLosers: LoserBetingUser[]
) {
  const fieldsWinners: RestOrArray<APIEmbedField> = [
    { name: "Winners :star_struck:", value: "Nice job bois" },
    ...updatedWinners.map((winner) => ({
      name: `\u200b`,
      value: `<@${winner.updatedUser.discordId}> won ${
        winner.winnings.nicu ? winner.winnings.nicu.toString() + " Nicu" : ""
      } ${
        winner.winnings.tzapi ? winner.winnings.tzapi.toString() + " Tzapi" : ""
      }!`,
    })),
  ];
  const fieldsLosers: RestOrArray<APIEmbedField> = [
    {
      name: "Losers :person_in_manual_wheelchair:",
      value: "Hahahaha git gut",
    },
    ...updatedLosers.map((loser) => ({
      name: `\u200b`,
      value: `<@${loser.updatedUser.discordId}> lost ${
        loser.loss.nicu ? loser.loss.nicu.toString() + " Nicu" : ""
      } ${loser.loss.tzapi ? loser.loss.tzapi.toString() + " Tzapi" : ""}!`,
    })),
  ];

  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("League Bets :coin:")
    .setDescription(`The bet on \`${game.player}\`'s match has resolved.`)
    .addFields(
      { name: "Total Bets Placed", value: `${(bets ?? []).length}` },
      { name: "\u200b", value: "\u200b" },
      ...fieldsWinners,
      { name: "\u200b", value: "\u200b" },
      ...fieldsLosers,
      { name: "\u200b", value: "\u200b" }
    )
    .setTimestamp();
}

export function getCheckFinishedMatchButton(
  summonerPUUID: string,
  matchId: string
) {
  const encodedSummonerPUUIDAndMatchId = encodeBase1114111(
    summonerPUUID + "@" + matchId
  );
  const customId = `show-finished-match${encodedSummonerPUUIDAndMatchId}`;
  return new ButtonBuilder()
    .setLabel("Show Match Result")
    .setCustomId(customId)
    .setStyle(ButtonStyle.Primary);
}

export function colorByWinrate(winrate: number) {
  if (winrate < 30) {
    // Red
    return "#B71C1C";
  }
  if (winrate < 50) {
    // Gray
    return "#838383";
  }
  if (winrate < 60) {
    // Green
    return "#43A047";
  }
  if (winrate < 70) {
    // Blue
    return "#1E88E5";
  }

  // Orange
  return "#FB8C00";
}

export function colorByKDA(winrate: number) {
  if (winrate < 1) {
    // Red
    return "#B71C1C";
  }
  if (winrate < 2) {
    // Gray
    return "#838383";
  }
  if (winrate < 4) {
    // Green
    return "#43A047";
  }
  if (winrate < 6) {
    // Blue
    return "#1E88E5";
  }

  // Orange
  return "#FB8C00";
}

export function getChampionSrc(id: number) {
  const champion = champions.find((c) => c.id === id);
  const imagePath = `src/assets/img/champion/${champion?.name}.png`;

  const src = htmlImgSrcFromPath(imagePath);
  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}

export function getSummonerSpellSrc(id: number) {
  const name = summonerSpells[id].id;
  const imagePath = `src/assets/img/spell/${name}.png`;
  const src = htmlImgSrcFromPath(imagePath);

  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}

export function getPerkSrc(id: number) {
  const perk = perks.find((p) => p.id === id);
  const imagePath = `src/assets/img/${perk?.icon}`;

  const src = htmlImgSrcFromPath(imagePath);

  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}

export function getItemSrc(id: number) {
  const imagePath = `src/assets/img/item/${id}.png`;
  const src = htmlImgSrcFromPath(imagePath);

  if (!src) {
    return htmlImgSrcFromPath(IMAGE_NOT_FOUND);
  }

  return src;
}
