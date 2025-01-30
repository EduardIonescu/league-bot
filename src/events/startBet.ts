import { ButtonInteraction, Events } from "discord.js";
import { getAccounts } from "../lib/utils/game.js";
import { placeBet } from "../lib/utils/interaction.js";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ButtonInteraction) {
    if (!interaction.customId?.startsWith("start-bet")) {
      return;
    }
    const summonerPUUID = interaction.customId.slice(10);
    const { accounts } = await getAccounts();
    const account = accounts?.find(
      (acc) => acc.summonerPUUID === summonerPUUID
    );

    try {
      await placeBet(interaction, account);
      return;
    } catch {
      return;
    }
  },
};
