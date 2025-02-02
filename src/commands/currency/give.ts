import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { handleDefer } from "../../lib/utils/customReply.js";
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
    const deferHandler = handleDefer(interaction);
    deferHandler.start();

    const giverDiscordId = interaction.user.id;
    const { error: giverError, user: giverUser } = await getBettingUser(
      giverDiscordId
    );
    if (giverError || !giverUser) {
      interaction.customReply(
        "User not found. Try again or try /currency first."
      );
      deferHandler.cancel();

      return;
    }

    const receiverDiscordId = interaction.options.get("user", true).user?.id;
    if (!receiverDiscordId) {
      interaction.customReply("Receiver user not found.");
      deferHandler.cancel();

      return;
    }

    if (giverDiscordId === receiverDiscordId) {
      interaction.customReply({
        content: "You fool. You tried to give tzapi to yourself!",
      });
      deferHandler.cancel();

      return;
    }

    const { error: receiverError, user: receiverUser } = await getBettingUser(
      receiverDiscordId
    );
    if (receiverError || !receiverUser) {
      interaction.customReply(
        "User not found. Try again or try /currency first."
      );
      deferHandler.cancel();

      return;
    }

    let amount = interaction.options.get("amount", true).value;

    if (!amount || typeof amount === "boolean") {
      console.log("Amount is undefiend or boolean. ", amount);
      interaction.customReply("Amount can't be empty.");
      deferHandler.cancel();

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

      interaction.customReply(
        `\`${
          interaction.options.get("amount")?.value
        }\` must be a number and bigger than 0.`
      );
      deferHandler.cancel();

      return;
    }

    if (giverUser.currency.tzapi < amount) {
      interaction.customReply(
        `You need ${amount} Tzapi. You only have ${giverUser.currency.tzapi} Tzapi`
      );
      deferHandler.cancel();

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
      interaction.customReply(
        `An error has occured updating <@${
          updateGiverError ? giverDiscordId : receiverDiscordId
        }>.`
      );
      deferHandler.cancel();

      return;
    }

    interaction.customReply(
      `<@${giverDiscordId}> gave <@${receiverDiscordId}> \`${amount}\` Tzapi.\n<@${receiverDiscordId}> thanks him dearly!`
    );
    deferHandler.cancel();

    return;
  },
};
