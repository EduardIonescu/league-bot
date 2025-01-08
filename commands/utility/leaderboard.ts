import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { getLeaderboard } from "../../utils.js";

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top betters by results."),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const { error, users } = await getLeaderboard();

    if (error || !users || users.length === 0) {
      await interaction.editReply(error ?? "Error loading users.");
    }
    const usersByCurrency = users!.map(
      (user, index) =>
        `${index + 1}. <@${user.discordId}>\n${user.currency} Tzapi\n${
          Math.round(
            (user.data.wins / (user.data.wins + user.data.loses)) * 100 * 10
          ) / 10
        }% Winrate`
    );
    const reply = `Leaderboard\n${usersByCurrency.join("\n\n")}`;

    await interaction.editReply(reply);
  },
};
