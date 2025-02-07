import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { NICU_IN_TZAPI } from "../../lib/constants.js";
import { logInteractionUsage } from "../../lib/db/logging.js";
import { getUser, updateUser } from "../../lib/db/user.js";
import { Currencies, Currency } from "../../lib/types/common.js";
import { handleDefer } from "../../lib/utils/customReply.js";

const convertChoices = [
  { name: "Tzapi", value: "tzapi" },
  { name: "Nicu", value: "nicu" },
];

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("convert")
    .setDescription("Convert Tzapi to Nicu and viceversa")
    .addStringOption((option) =>
      option
        .setName("to")
        .setDescription("Convert to currency")
        .setRequired(true)
        .addChoices(...convertChoices)
    )
    .addStringOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of currency you want.")
        .setMaxLength(8)
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction) {
    const deferHandler = handleDefer(interaction);
    deferHandler.start();

    const discordId = interaction.user.id;
    const { error, user } = getUser(discordId);

    if (error || !user) {
      console.log("error", error);
      interaction.customReply(
        "User not found. Try again or try /currency first."
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    let amount = interaction.options.get("amount")?.value;

    if (typeof amount === "boolean") {
      console.log(
        "Tried to convert a boolean. ",
        interaction.options.get("amount")?.value
      );
      interaction.customReply(`\`${amount}\` is not a number.`);
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    if (!amount) {
      amount = 1;
    }

    amount = parseInt(amount as string);
    if (!amount || isNaN(amount)) {
      console.log(
        "Tried to convert a string? ",
        interaction.options.get("amount")?.value
      );
      interaction.customReply(
        `\`${interaction.options.get("amount")?.value}\` is not a number.`
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    const to = interaction.options.get("to", true).value as Currency;

    if (to === "nicu") {
      amount = Math.round(amount);

      const requiredTzapi = amount * NICU_IN_TZAPI;

      if (user.balance.tzapi < requiredTzapi) {
        interaction.customReply(
          `You need ${requiredTzapi} Tzapi. You only have ${user.balance.tzapi} Tzapi`
        );
        deferHandler.cancel();
        logInteractionUsage(interaction);

        return;
      }

      const nicu = user.balance.nicu + amount;
      const tzapi = user.balance.tzapi - requiredTzapi;
      const balance = { ...user.balance, nicu: nicu, tzapi: tzapi };
      const updatedUser = { ...user, balance };
      const { error: updateError } = updateUser(updatedUser);

      if (updateError) {
        interaction.customReply(
          `An error has occured saving your updated currencies. Try again.`
        );
        deferHandler.cancel();
        logInteractionUsage(interaction);

        return;
      }

      console.log("Conversion completed for: ", discordId);
      interaction.customReply(
        `Conversion completed!\n<@${discordId}> now has ${tzapi} Tzapi and ${nicu} Nicu.`
      );
      deferHandler.cancel();
      logInteractionUsage(interaction, true);

      return;
    }

    if (user.balance.nicu < amount) {
      interaction.customReply(
        `You need ${amount} Nicu. You only have ${user.balance.nicu} Nicu`
      );
      deferHandler.cancel();
      logInteractionUsage(interaction);

      return;
    }

    const nicu = user.balance.nicu - amount;
    const tzapi = user.balance.tzapi + amount * NICU_IN_TZAPI;
    const balance: Currencies = {
      ...user.balance,
      nicu: nicu,
      tzapi: tzapi,
    };
    const updatedUser = { ...user, balance };
    const { error: updateError } = updateUser(updatedUser);

    if (updateError) {
      console.log("updateError", updateError);
      interaction.customReply(
        `An error has occured saving your updated currencies. Try again.`
      );
      logInteractionUsage(interaction);
      deferHandler.cancel();

      return;
    }

    console.log(
      "Conversion completed for: ",
      discordId,
      " - ",
      interaction.user.username
    );
    interaction.customReply(
      `Conversion completed!\n<@${discordId}> now has ${tzapi} Tzapi and ${nicu} Nicu.`
    );
    deferHandler.cancel();
    logInteractionUsage(interaction, true);

    return;
  },
};
