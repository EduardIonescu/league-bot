import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  Message,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} from "discord.js";
import { setTimeout } from "node:timers/promises";
import puppeteer from "puppeteer";
import { LiveGameHTML } from "../../components.js";
import { SpectatorParticipant } from "../../types.js";
import {
  formatPlayerName,
  getAccountData,
  getAccounts,
  getSpectatorData,
  Region,
} from "../../utils.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("check")
    .setDescription("Check if any account is in game"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const { error, accounts } = await getAccounts();

    if (error || !accounts || accounts.length === 0) {
      await interaction.editReply(
        "No accounts are saved. Try saving some accounts first with `/add`"
      );

      return;
    }

    const accountsInGame = [];
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

      msg.push(`\`${player}\` ${isInGameMessage} ${relativeTime}`);
    }

    playerButtonsColumns.push(playerButtonsRow);

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
  },
};

async function checkCollector(
  message: Message,
  _interaction: CommandInteraction,
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

    const participantsStats = [];

    for (const participant of account.participants) {
      const { error, account: participantAccount } = await getAccountData(
        participant.summonerId,
        account.region
      );

      if (participantAccount && participantAccount.length > 0) {
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
        });
      } else {
        participantsStats.push({
          teamId: participant.teamId,
          riotId: participant.riotId,
          championId: participant.championId,
          spell1Id: participant.spell1Id,
          spell2Id: participant.spell2Id,
        });
      }
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

    // Wait for images to load
    await setTimeout(180);

    const screenshot = await page.screenshot({ fullPage: true });
    await browser.close();

    const screenshotBuffer = Buffer.from(screenshot);
    const image = new AttachmentBuilder(screenshotBuffer, { name: "live.png" });

    await buttonInteraction.update({
      content: message.content,
      components: message.components,
    });
    await channel.send({ files: [image] });
  });

  collector.on("end", () => {
    playerButtonsColumns.forEach((row) =>
      row.components.forEach((button) => button.setDisabled(true))
    );
    message.edit({ components: playerButtonsColumns });
  });
}
