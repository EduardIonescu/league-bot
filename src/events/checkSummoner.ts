import {
  ActionRowBuilder,
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
import { AccountData, Region } from "../lib/types/riot.js";
import { calculateLaneWeights } from "../lib/utils/game.js";
import { fetchAccountData, fetchSpectatorData } from "../lib/utils/riot.js";
import { screenshot } from "../lib/utils/screenshot.js";

// Shell is supposed to be older but I found it's way faster
const browser = await puppeteer.launch({ headless: "shell" });

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

    const { error, spectatorData } = await fetchSpectatorData(
      summonerPUUID,
      region
    );

    if (error || !spectatorData) {
      console.log("Match not found . spectatorData: ", spectatorData);
      await interaction.editReply(error);
      return;
    }

    const participantsStats: ParticipantStats[] = await Promise.all(
      spectatorData.participants.map(async (participant) => {
        const { account: participantAccount } = await fetchAccountData(
          participant.summonerId,
          region
        );

        const weights = calculateLaneWeights(participant);

        let rankedStats: AccountData | undefined;
        if (Array.isArray(participantAccount)) {
          rankedStats = participantAccount.find(
            (acc) => acc.queueType === "RANKED_SOLO_5x5"
          );
        } else if (participantAccount?.queueType === "RANKED_SOLO_5x5") {
          rankedStats = participantAccount;
        }

        return {
          rankedStats,
          teamId: participant.teamId,
          riotId: participant.riotId,
          championId: participant.championId,
          spell1Id: participant.spell1Id,
          spell2Id: participant.spell2Id,
          perks: participant.perks,
          weights,
        };
      })
    );

    const html = LiveGameHTML(participantsStats);
    const image = await screenshot(browser, html, { width: 1920, height: 780 });

    const button = new ButtonBuilder()
      .setCustomId(`start-bet-${summonerPUUID}`)
      .setLabel(`Start Bet`)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(button);

    interaction.editReply({ files: [image], components: [row] });
  },
};
