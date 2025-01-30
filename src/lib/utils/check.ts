import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  Message,
  time,
  TimestampStyles,
} from "discord.js";
import puppeteer from "puppeteer";
import {
  LiveGameHTML,
  ParticipantStats,
} from "../components/spectatorMatch.js";
import { Account, Region, SpectatorParticipant } from "../types/riot.js";
import { calculateLaneWeights, formatPlayerName, getAccounts } from "./game.js";
import { getAccountData, getSpectatorData } from "./riot.js";

export async function check(
  interaction: CommandInteraction | ButtonInteraction
) {
  await interaction.deferReply();

  const { error, accounts } = await getAccounts();

  if (error || !accounts || accounts.length === 0) {
    await interaction.editReply(
      "No accounts are saved. Try saving some accounts first with `/add`"
    );

    return;
  }

  const accountsInGame: (Account & {
    gameStartTime: number;
    participants: SpectatorParticipant[];
    gameMode: string;
  })[] = [];
  for (const account of accounts) {
    const spectatorData = await getSpectatorData(
      account.summonerPUUID,
      account.region
    );

    if (
      !spectatorData ||
      typeof spectatorData === "string" ||
      "status" in spectatorData
    ) {
      continue;
    }

    if (!spectatorData.gameStartTime) {
      continue;
    }

    accountsInGame.push({
      ...account,
      gameStartTime: spectatorData.gameStartTime,
      participants: spectatorData.participants,
      gameMode: spectatorData.gameMode,
    });
  }

  if (!accountsInGame || accountsInGame.length === 0) {
    await interaction.editReply("No players are in game right now.");

    return;
  }

  const msg: string[] = [];
  const playerButtonsColumns: ActionRowBuilder<ButtonBuilder>[] = [];
  const playerButtonsRow = new ActionRowBuilder<ButtonBuilder>();
  for (const account of accountsInGame) {
    const player = formatPlayerName(account.gameName, account.tagLine);

    const isInGameMessage = "is in game since";
    const relativeTime = time(
      new Date(account.gameStartTime),
      TimestampStyles.RelativeTime
    );

    msg.push(`\`${player}\` ${isInGameMessage} ${relativeTime}`);

    /** Only allow summoners rift  */
    if (account.gameMode.toLowerCase() !== "Classic".toLowerCase()) {
      continue;
    }

    // Can only add 5 x 5 buttons to a message (use pagination if you want more)
    if (
      playerButtonsColumns.length === 5 &&
      playerButtonsRow.components.length === 5
    ) {
      continue;
    }

    const playerButton = new ButtonBuilder()
      .setLabel(player)
      .setCustomId(`check-${account.summonerPUUID}`)
      .setStyle(ButtonStyle.Primary);

    if (playerButtonsRow.components.length <= 4) {
      playerButtonsRow.addComponents(playerButton);
    } else {
      playerButtonsColumns.push(playerButtonsRow);
      playerButtonsRow.setComponents(playerButton);
    }
  }

  playerButtonsColumns.push(playerButtonsRow);

  if (playerButtonsColumns.length) {
    const message = await interaction.editReply({
      content: msg.join("\n"),
      components: playerButtonsColumns,
    });
    await checkCollector(
      message,
      interaction,
      playerButtonsColumns,
      accountsInGame
    );
    return;
  }

  await interaction.editReply({
    content: msg.join("\n"),
  });
  return;
}

async function checkCollector(
  message: Message,
  _interaction: CommandInteraction | ButtonInteraction,
  playerButtonsColumns: ActionRowBuilder<ButtonBuilder>[],
  accountsInGame: {
    gameStartTime: number;
    participants: SpectatorParticipant[];
    gameName: string;
    tagLine: string;
    summonerPUUID: string;
    region: Region;
  }[]
) {
  const collectorFilter = (_: any) => true;

  const collector = message.createMessageComponentCollector({
    filter: collectorFilter,
    time: 5 * 60_000,
  });

  collector.on("collect", async (buttonInteraction) => {
    if (!buttonInteraction.customId.startsWith(`check-`)) {
      return;
    }
    if (!message.editable) {
      console.log("Message is not editable", message);
      return;
    }

    // The buttons are of format `check-${summonerPUUID}` so slice at `-` to get it
    const summonerPUUID = buttonInteraction.customId.slice(6);

    if (!summonerPUUID) {
      console.log("summonerPUUID not found: ", summonerPUUID);
      await buttonInteraction.update({
        content: message.content,
        components: message.components,
      });
      await buttonInteraction.followUp(`Player not found`);
      return;
    }

    const account = accountsInGame.find(
      (acc) => acc.summonerPUUID === summonerPUUID
    );
    if (!account) {
      console.log("Account not found: ", summonerPUUID, account);
      await buttonInteraction.update({
        content: message.content,
        components: message.components,
      });
      await buttonInteraction.followUp(`Player not found`);
      return;
    }

    const participantsStats: ParticipantStats[] = [];

    for (const participant of account.participants) {
      const { error, account: participantAccount } = await getAccountData(
        participant.summonerId,
        account.region
      );

      const weights = calculateLaneWeights(participant);

      if (error || !participantAccount || participantAccount.length === 0) {
        console.log("error", error);
        console.log("error", participantAccount);
        console.log("participant", participant);
        console.log("account", account);
        {
          participantsStats.push({
            teamId: participant.teamId,
            riotId: participant.riotId,
            championId: participant.championId,
            spell1Id: participant.spell1Id,
            spell2Id: participant.spell2Id,
            perks: participant.perks,
            weights,
          });
        }
        continue;
      }

      const rankedStats = participantAccount.find(
        (acc) => acc.queueType === "RANKED_SOLO_5x5"
      );

      participantsStats.push({
        rankedStats,
        teamId: participant.teamId,
        riotId: participant.riotId,
        championId: participant.championId,
        spell1Id: participant.spell1Id,
        spell2Id: participant.spell2Id,
        perks: participant.perks,
        weights,
      });
    }

    const channel = buttonInteraction.channel;

    if (!channel || !channel.isSendable()) {
      console.log("Channel not sendable");
      return;
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport({ width: 1920, height: 780 });

    const html = LiveGameHTML(participantsStats);

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const screenshot = await page.screenshot({ fullPage: true });
    await browser.close();

    const screenshotBuffer = Buffer.from(screenshot);
    const image = new AttachmentBuilder(screenshotBuffer, { name: "live.png" });

    await buttonInteraction.update({
      content: message.content,
      components: message.components,
    });

    const playerAccount = accountsInGame.find(
      (acc) => acc.summonerPUUID === summonerPUUID
    );
    if (!playerAccount) {
      await channel.send({ files: [image] });
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId(`start-bet-${summonerPUUID}`)
      .setLabel(`Start Bet`)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(button);

    await channel.send({ files: [image], components: [row] });
  });

  collector.on("end", async () => {
    playerButtonsColumns.forEach((row) =>
      row.components.forEach((button) => button.setDisabled(true))
    );
    try {
      if (message && message.editable) {
        await message.edit({
          content: message.content,
          components: playerButtonsColumns,
        });
      }
    } catch (err) {
      console.log("Error in check.ts ", err);
    }
  });
}

export function getCheckButton(primary: boolean = true) {
  return new ButtonBuilder()
    .setLabel("Check Live Games")
    .setCustomId("check")
    .setStyle(primary ? ButtonStyle.Primary : ButtonStyle.Secondary);
}
