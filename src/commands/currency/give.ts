import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { getBettingUser, updateUser } from "../../lib/utils/game.js";

export default {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give Tzapi to a user")
    .addMentionableOption((option) =>
      option.setName("user").setDescription("User to give to").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to give")
        .setRequired(true)
    ),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const giverDiscordId = interaction.user.id;
    const { error: giverError, user: giverUser } = await getBettingUser(
      giverDiscordId
    );
    if (giverError || !giverUser) {
      await interaction.editReply(
        "User not found. Try again or try /currency first."
      );
      return;
    }

    const receiverDiscordId = interaction.options.get("user", true).user?.id;
    if (!receiverDiscordId) {
      await interaction.editReply("Receiver user not found.");
      return;
    }

    if (giverDiscordId === receiverDiscordId) {
      await interaction.editReply({
        content: "You fool. You tried to give tzapi to yourself!",
      });
      return;
    }

    const { error: receiverError, user: receiverUser } = await getBettingUser(
      receiverDiscordId
    );
    if (receiverError || !receiverUser) {
      await interaction.editReply(
        "User not found. Try again or try /currency first."
      );
      return;
    }

    let amount = interaction.options.get("amount", true).value;

    if (!amount || typeof amount === "boolean") {
      console.log("Amount is undefiend or boolean. ", amount);
      await interaction.editReply("Amount can't be empty.");
      return;
    }

    if (typeof amount === "string") {
      amount = parseInt(amount);
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      console.log(
        "Amount must be a number. ",
        interaction.options.get("amount")?.value
      );

      await interaction.editReply(
        `\`${
          interaction.options.get("amount")?.value
        }\` must be a number and bigger than 0.`
      );
      return;
    }

    if (giverUser.currency.tzapi < amount) {
      await interaction.editReply(
        `You need ${amount} Tzapi. You only have ${giverUser.currency.tzapi} Tzapi`
      );
      return;
    }

    const giverTzapi = giverUser.currency.tzapi - amount;
    const giverCurrency = { ...giverUser.currency, tzapi: giverTzapi };

    const receiverTzapi = receiverUser.currency.tzapi + amount;
    const receiverCurrency = { ...receiverUser.currency, tzapi: receiverTzapi };

    const updatedGiverUser = { ...giverUser, currency: giverCurrency };
    const updatedReceiverUser = { ...receiverUser, currency: receiverCurrency };

    const { error: updateGiverError } = await updateUser(updatedGiverUser);
    const { error: updateReceiverError } = await updateUser(
      updatedReceiverUser
    );

    if (updateGiverError || updateReceiverError) {
      console.log("Error updating users");
      await interaction.editReply(
        `An error has occured updating <@${
          updateGiverError ? giverDiscordId : receiverDiscordId
        }>.`
      );

      return;
    }

    await interaction.editReply(
      `<@${giverDiscordId}> gave <@${receiverDiscordId}> \`${amount}\` Tzapi.\n<@${receiverDiscordId}> thanks him dearly!`
    );

    return;
  },
};
