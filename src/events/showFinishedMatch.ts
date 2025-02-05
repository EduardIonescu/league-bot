import { ButtonInteraction, Events } from "discord.js";
import puppeteer from "puppeteer";
import { FinishedMatchHTML } from "../lib/components/finishedMatch.js";
import { getFinishedMatch } from "../lib/db/match.js";
import { decodeBase1114111 } from "../lib/utils/common.js";
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
    const gameId = matchId.split("_")[1];
    if (!gameId) {
      await interaction.reply({ content: "Match not found" });
      return;
    }

    const { match, error } = getFinishedMatch(Number(gameId));
    if (
      error ||
      !match ||
      !match.participants ||
      match.participants.length === 0
    ) {
      await interaction.reply({
        content: error ?? "Match participants not found.",
      });
      return;
    }

    const html = FinishedMatchHTML(match.participants, match.gameDuration ?? 0);
    const image = await screenshot(browser, html, { width: 960, height: 780 });

    interaction.reply({ files: [image] });
  },
};
