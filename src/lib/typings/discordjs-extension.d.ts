import "discord.js";

declare module "discord.js" {
  interface BaseInteraction {
    customReply(
      options: string | MessagePayload | InteractionReplyOptions
    ): Promise<Message<boolean> | InteractionResponse<boolean>>;
  }
}
