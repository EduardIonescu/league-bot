import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { NICU_IN_TZAPI } from "../../lib/constants.js";
import { Currencies, Currency } from "../../lib/types/common.js";
import { getBettingUser, updateUser } from "../../lib/utils/game.js";

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
    const { error, user: bettingUser } = await getBettingUser(discordId);
    if (error || !bettingUser) {
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
      if (bettingUser.currency.tzapi < requiredTzapi) {
        await interaction.editReply(
          `You need ${requiredTzapi} Tzapi. You only have ${bettingUser.currency.tzapi} Tzapi`
        );
        return;
      }

      const nicu = bettingUser.currency.nicu + amount;
      const tzapi = bettingUser.currency.tzapi - requiredTzapi;
      const currency: Currencies = { ...bettingUser.currency, nicu, tzapi };
      const updatedUser = { ...bettingUser, currency };
      const { error: updateError } = await updateUser(updatedUser);
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

    if (bettingUser.currency.nicu < amount) {
      await interaction.editReply(
        `You need ${amount} Nicu. You only have ${bettingUser.currency.nicu} Nicu`
      );
      return;
    }

    const nicu = bettingUser.currency.nicu - amount;
    const tzapi = bettingUser.currency.tzapi + amount * NICU_IN_TZAPI;
    const currency: Currencies = { ...bettingUser.currency, nicu, tzapi };
    const updatedUser = { ...bettingUser, currency };
    const { error: updateError } = await updateUser(updatedUser);
    if (updateError) {
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
