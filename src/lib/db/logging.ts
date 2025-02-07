import { ButtonInteraction, CommandInteraction } from "discord.js";
import db from "../../data/db.js";
import { InteractionUsage } from "../types/logging.js";

export function saveInteractionUsage(interactionUsage: InteractionUsage) {
  try {
    const stmt = db.prepare(`
        INSERT INTO interactionUsage 
        (interactionName, discordId, guildId, success)
        VALUES (?, ?, ?, ?);
      `);

    stmt.run(
      interactionUsage.interactionName,
      interactionUsage.discordId,
      interactionUsage.guildId ?? null,
      interactionUsage.success
    );
  } catch (error) {
    console.log("error", error);
  }
}

export function logInteractionUsage(
  interaction: CommandInteraction | ButtonInteraction,
  success: boolean = false
) {
  let interactionName: string;
  if ("commandName" in interaction) {
    interactionName = interaction.commandName;
  } else {
    interactionName = interaction.customId;
  }

  const interactionUsage: InteractionUsage = {
    interactionName,
    discordId: interaction.user.id,
    guildId: interaction.guildId,
    success: success ? 1 : 0,
  };

  saveInteractionUsage(interactionUsage);
}
