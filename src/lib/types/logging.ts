export type InteractionUsage = {
  interactionName: string;
  discordId: string;
  guildId: string | null;
  success: 0 | 1;
};
