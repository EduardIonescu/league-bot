import {
  ButtonInteraction,
  CommandInteraction,
  InteractionReplyOptions,
  MessagePayload,
} from "discord.js";

CommandInteraction.prototype.customReply = async function (
  options: string | MessagePayload | InteractionReplyOptions
) {
  if (this.deferred || this.replied) {
    return await this.editReply(options);
  }

  return await this.reply(options);
};

const TIMEOUT_DEFER_REPLY = 2200;

/** To use at the start of an interaction to delay deferReply (saves 200-300ms on average)  */
export function handleDefer(
  interaction: CommandInteraction | ButtonInteraction
) {
  let timeout: NodeJS.Timeout;
  const start = () => {
    timeout = setTimeout(async () => {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }
    }, TIMEOUT_DEFER_REPLY);
  };

  const cancel = () => {
    clearTimeout(timeout);
  };

  return { start, cancel };
}
