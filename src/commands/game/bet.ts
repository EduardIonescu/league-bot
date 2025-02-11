import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("bet")
    .setDescription("Bet on League matches' outcomes vs the bot."),
  // .addStringOption((option) =>
  //   option
  //     .setName("account")
  //     .setDescription("Account")
  //     .setRequired(true)
  //     .addChoices(...choices)
  // )
  async execute(interaction: CommandInteraction) {
    return interaction.reply("Under construction...");
    // const summonerPUUID = (
    //   interaction.options as CommandInteractionOptionResolver
    // ).getString("account");
    // console.log("summonerPUUID", summonerPUUID);

    // const account = accounts?.find(
    //   (acc) => acc.summonerPUUID === summonerPUUID
    // );

    // await startBet(interaction, account);
  },
};
