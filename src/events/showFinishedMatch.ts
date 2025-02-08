import { ButtonInteraction, Events } from "discord.js";
import { FinishedMatchHTML } from "../lib/components/finishedMatch.js";
import { logInteractionUsage } from "../lib/db/logging.js";
import { getFinishedMatch } from "../lib/db/match.js";
import { browser } from "../lib/utils/browser.js";
import { decodeBase1114111 } from "../lib/utils/common.js";
import { screenshot } from "../lib/utils/screenshot.js";

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
      logInteractionUsage(interaction);

      return;
    }
    const gameId = matchId.split("_")[1];
    if (!gameId) {
      await interaction.reply({ content: "Match not found" });
      logInteractionUsage(interaction);

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
      logInteractionUsage(interaction);

      return;
    }

    const html = FinishedMatchHTML(match.participants, match.gameDuration ?? 0);
    const image = await screenshot(browser, html, { width: 960, height: 780 });

    interaction.reply({ files: [image] });
    logInteractionUsage(interaction, true);
  },
};
