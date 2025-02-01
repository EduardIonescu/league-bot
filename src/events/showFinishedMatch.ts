import { ButtonInteraction, Events } from "discord.js";
import { performance } from "node:perf_hooks";
import puppeteer from "puppeteer";
import { FinishedMatchHTML } from "../lib/components/finishedMatch.js";
import { decodeBase1114111 } from "../lib/utils/common.js";
import { getFinishedGame } from "../lib/utils/game.js";
import { screenshot } from "../lib/utils/screenshot.js";

// Shell is supposed to be older but I found it's way faster
const browser = await puppeteer.launch({ headless: "shell" });

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.customId?.startsWith("show-finished-match")) {
      return;
    }

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
      await interaction.reply({ content: "Match not found" });
      return;
    }
    const { match, error } = await getFinishedGame(summonerPUUID, matchId);
    if (error || !match) {
      await interaction.reply({ content: error });
      return;
    }
    const b = performance.now();

    const html = FinishedMatchHTML(match.participants, match.gameDuration);
    const image = await screenshot(browser, html, { width: 960, height: 780 });

    interaction.reply({ files: [image] });
  },
};
