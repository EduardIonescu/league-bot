import { Events, Message } from "discord.js";
import * as dotenv from "dotenv";
import { getMessageById, removeMessage } from "../lib/db/match.js";
dotenv.config();

export default {
  name: Events.MessageDelete,
  async execute(message: Message) {
    if (!message.author.bot || message.applicationId !== process.env.APP_ID) {
      return;
    }

    if (!getMessageById(message.id)) {
      return;
    }

    const removed = removeMessage(message.id, message.channelId);
    console.log("Removed: ", removed, ". Message id: ", message.id);
  },
};
