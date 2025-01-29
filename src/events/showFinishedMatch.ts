import { AttachmentBuilder, ButtonInteraction, Events } from "discord.js";
import { setTimeout } from "node:timers/promises";
import puppeteer from "puppeteer";
import { FinishedMatchHTML } from "../lib/components/finishedMatch.js";
import { decodeBase1114111 } from "../lib/utils/common.js";
import { getFinishedGame } from "../lib/utils/game.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("show-finished-match")) {
      return;
    }
    await interaction.deferReply();

    const encodedSummonerPUUIDAndMatchId = interaction.customId.replace(
      "show-finished-match",
      ""
    );
    const [summonerPUUID, matchId] = decodeBase1114111(
      encodedSummonerPUUIDAndMatchId
    ).split("@");

    if (!summonerPUUID || !matchId) {
      console.log("encodedSummonerPUUID", summonerPUUID);
      console.log("encodedMatchId", matchId);
      await interaction.editReply({ content: "Match not found" });
      return;
    }

    const { match, error } = await getFinishedGame(summonerPUUID, matchId);
    if (error || !match) {
      await interaction.editReply({ content: error });
      return;
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport({ width: 960, height: 780 });

    const html = FinishedMatchHTML(match.participants, match.gameDuration);

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // Wait for images to load
    await setTimeout(400);

    const screenshot = await page.screenshot({ fullPage: true });
    await browser.close();

    const screenshotBuffer = Buffer.from(screenshot);
    const image = new AttachmentBuilder(screenshotBuffer, { name: "live.png" });

    await interaction.editReply({ files: [image] });
  },
};
