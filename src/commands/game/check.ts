import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { check } from "../../lib/utils/check.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("check")
    .setDescription("Check if any account is in game"),
  async execute(interaction: CommandInteraction) {
    await check(interaction);
  },
};
