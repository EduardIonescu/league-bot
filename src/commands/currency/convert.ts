import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { NICU_IN_TZAPI } from "../../lib/constants.js";
import { getUser, updateUser as updateDbUser } from "../../lib/db/user.js";
import { Currencies, Currency } from "../../lib/types/common.js";

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
    await interaction.deferReply();

    const discordId = interaction.user.id;
    const { error, user } = getUser(discordId);

    if (error || !user) {
      console.log("error", error);
      await interaction.editReply(
        "User not found. Try again or try /currency first."
      );
      return;
    }

    let amount = interaction.options.get("amount")?.value;

    if (typeof amount === "boolean") {
      console.log(
        "Tried to convert a boolean. ",
        interaction.options.get("amount")?.value
      );
      await interaction.editReply(`\`${amount}\` is not a number.`);
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
      await interaction.editReply(
        `\`${interaction.options.get("amount")?.value}\` is not a number.`
      );
      return;
    }

    const to = interaction.options.get("to", true).value as Currency;

    if (to === "nicu") {
      amount = Math.round(amount);

      const requiredTzapi = amount * NICU_IN_TZAPI;

      if (user.balance.tzapi < requiredTzapi) {
        await interaction.editReply(
          `You need ${requiredTzapi} Tzapi. You only have ${user.balance.tzapi} Tzapi`
        );
        return;
      }

      const nicu = user.balance.nicu + amount;
      const tzapi = user.balance.tzapi - requiredTzapi;
      const balance = { ...user.balance, nicu: nicu, tzapi: tzapi };
      const updatedUser = { ...user, balance };
      const { error: updateError } = updateDbUser(updatedUser);

      if (updateError) {
        await interaction.editReply(
          `An error has occured saving your updated currencies. Try again.`
        );
        return;
      }

      console.log("Conversion completed for: ", discordId);
      await interaction.editReply(
        `Conversion completed!\n<@${discordId}> now has ${tzapi} Tzapi and ${nicu} Nicu.`
      );
      return;
    }

    if (user.balance.nicu < amount) {
      await interaction.editReply(
        `You need ${amount} Nicu. You only have ${user.balance.nicu} Nicu`
      );
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
    const { error: updateError } = updateDbUser(updatedUser);

    if (updateError) {
      console.log("updateError", updateError);
      await interaction.editReply(
        `An error has occured saving your updated currencies. Try again.`
      );
      return;
    }

    console.log(
      "Conversion completed for: ",
      discordId,
      " - ",
      interaction.user.username
    );
    await interaction.editReply(
      `Conversion completed!\n<@${discordId}> now has ${tzapi} Tzapi and ${nicu} Nicu.`
    );
    return;
  },
};
