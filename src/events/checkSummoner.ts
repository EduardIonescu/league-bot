import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Events,
} from "discord.js";
import puppeteer from "puppeteer";
import {
  LiveGameHTML,
  ParticipantStats,
} from "../lib/components/spectatorMatch.js";
import { Region } from "../lib/types/riot.js";
import { calculateLaneWeights } from "../lib/utils/game.js";
import { getAccountData, getSpectatorData } from "../lib/utils/riot.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.customId?.startsWith("check-")) {
      return;
    }

    await interaction.deferReply();
    // The buttons are of format `check-${encryptedSummonerPUUIDAndRegion}` so slice at `-` to get it
    const summonerPUUIDAndRegion = interaction.customId.slice(6);
    const [summonerPUUID, region] = summonerPUUIDAndRegion.split("@") as [
      string,
      Region
    ];

    if (!summonerPUUID || !region) {
      console.log("summonerPUUID not found: ", summonerPUUID);
      await interaction.editReply(`Player not found`);
      return;
    }

    const { error, spectatorData } = await getSpectatorData(
      summonerPUUID,
      region
    );

    if (error || !spectatorData) {
      console.log("Match not found . spectatorData: ", spectatorData);
      await interaction.editReply(error);
      return;
    }

    const participantsStats: ParticipantStats[] = [];

    for (const participant of spectatorData.participants) {
      const { error, account: participantAccount } = await getAccountData(
        participant.summonerId,
        region
      );

      const weights = calculateLaneWeights(participant);

      if (
        error ||
        !participantAccount ||
        (Array.isArray(participantAccount) && participantAccount.length === 0)
      ) {
        console.log("Error in checkSummoner.ts");
        console.log("error", error);
        console.log("error", participantAccount);
        console.log("participant", participant);
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

      const rankedStats = Array.isArray(participantAccount)
        ? participantAccount.find((acc) => acc.queueType === "RANKED_SOLO_5x5")
        : participantAccount.queueType === "RANKED_SOLO_5x5"
        ? participantAccount
        : undefined;

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

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport({ width: 1920, height: 780 });

    const html = LiveGameHTML(participantsStats);

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const screenshot = await page.screenshot({ fullPage: true });
    await browser.close();

    const screenshotBuffer = Buffer.from(screenshot);
    const image = new AttachmentBuilder(screenshotBuffer, { name: "live.png" });

    const button = new ButtonBuilder()
      .setCustomId(`start-bet-${summonerPUUID}`)
      .setLabel(`Start Bet`)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(button);

    await interaction.editReply({ files: [image], components: [row] });
  },
};
