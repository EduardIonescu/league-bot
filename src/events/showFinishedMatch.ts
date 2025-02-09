import { ButtonInteraction, Events } from "discord.js";
import { performance } from "node:perf_hooks";
import { FinishedMatchHTML } from "../lib/components/finishedMatch.js";
import { logInteractionUsage } from "../lib/db/logging.js";
import { getFinishedMatch } from "../lib/db/match.js";
import { decodeBase1114111 } from "../lib/utils/common.js";
import { screenshot } from "../lib/utils/screenshot.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.customId?.startsWith("show-finished-match")) {
      return;
    }
    const start = performance.now();
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
    const beforeImage = performance.now();
    const image = await screenshot(html, { width: 920, height: 830 }, false);
    const beforeReply = performance.now();
    await interaction.reply({ files: [image] });
    const end = performance.now();
    logInteractionUsage(interaction, true);

    console.log(
      "beforeImage - start",
      Math.round((beforeImage - start) * 1000) / 1000 + " ms"
    );
    console.log(
      "total",
      Math.round((beforeReply - beforeImage) * 1000) / 1000 + " ms"
    );
    console.log(
      "end - beforeReply",
      Math.round((end - beforeReply) * 1000) / 1000 + " ms"
    );
    console.log(
      "beforeImage - start",
      Math.round((end - start) * 1000) / 1000 + " ms"
    );
    console.log("-----------------------------");
  },
};
