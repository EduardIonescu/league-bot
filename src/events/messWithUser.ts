import { Events, Message } from "discord.js";

const ID_TO_KICK = "229950412340330496";

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.member?.id !== ID_TO_KICK) {
      return;
    }

    // Make it 50/50 so Nicu thinks it'a discord bug haha
    const shouldKick = Math.random() * 100 > 66;
    if (!shouldKick) {
      return;
    }

    try {
      const userToKick = message.member;
      await userToKick?.voice.disconnect();
    } catch (err) {}
  },
};
