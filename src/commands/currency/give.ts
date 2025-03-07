import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { logInteractionUsage } from "../../lib/db/logging.js";
import { getOrAddUserIfAbsent, updateUser } from "../../lib/db/user.js";
import { handleDefer } from "../../lib/utils/customReply.js";

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

    const { error: errorGiver, user: giverUser } = getOrAddUserIfAbsent(
      giverDiscordId,
      interaction.guildId!
    );

    if (errorGiver || !giverUser) {
      interaction.customReply(errorGiver);
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    const receiverDiscordId = interaction.options.get("user", true).user?.id;
    if (!receiverDiscordId) {
      interaction.customReply("Receiver user not found.");
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    if (giverDiscordId === receiverDiscordId) {
      interaction.customReply({
        content: "You fool. You tried to give tzapi to yourself!",
      });
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    const { error: errorReceiver, user: receiverUser } = getOrAddUserIfAbsent(
      receiverDiscordId,
      interaction.guildId!
    );

    if (errorReceiver || !receiverUser) {
      interaction.customReply(
        "User not found. Try again or have them try /currency first."
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    let amount = interaction.options.get("amount", true).value;

    if (!amount || typeof amount === "boolean") {
      console.log("Amount is undefiend or boolean. ", amount);
      interaction.customReply("Amount can't be empty.");
      deferHandler.cancel();
      logInteractionUsage(interaction);

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
      logInteractionUsage(interaction);

      return;
    }

    if (giverUser.balance.tzapi < amount) {
      interaction.customReply(
        `You need ${amount} Tzapi. You only have ${giverUser.balance.tzapi} Tzapi`
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    const giverTzapi = giverUser.balance.tzapi - amount;
    const giverCurrency = { ...giverUser.balance, tzapi: giverTzapi };

    const receiverTzapi = receiverUser.balance.tzapi + amount;
    const receiverCurrency = {
      ...receiverUser.balance,
      tzapi: receiverTzapi,
    };

    const updatedGiverUser = { ...giverUser, balance: giverCurrency };
    const updatedReceiverUser = {
      ...receiverUser,
      balance: receiverCurrency,
    };

    const { error: updateGiverError } = updateUser(updatedGiverUser);
    const { error: updateReceiverError } = updateUser(updatedReceiverUser);

    if (updateGiverError || updateReceiverError) {
      console.log("Error updating users");
      interaction.customReply(
        `An error has occured updating <@${
          updateGiverError ? giverDiscordId : receiverDiscordId
        }>.`
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    interaction.customReply(
      `<@${giverDiscordId}> gave <@${receiverDiscordId}> \`${amount}\` Tzapi.\n<@${receiverDiscordId}> thanks him dearly!`
    );
    deferHandler.cancel();
    logInteractionUsage(interaction, true);

    return;
  },
};
