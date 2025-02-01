import {
  CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import * as fs from "fs/promises";

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all commands and their description"),
  async execute(interaction: CommandInteraction) {
    const commandFolderPath = "../../commands/";
    const absoluteCommandsPath = new URL(commandFolderPath, import.meta.url);
    const commandFolders = await fs.readdir(absoluteCommandsPath);

    let content = "";
    for (const folder of commandFolders) {
      const folderPath = new URL(folder + "/", absoluteCommandsPath);
      const commandFiles = await fs.readdir(folderPath);

      for (const file of commandFiles) {
        const filePath = new URL(file, folderPath);
        const command = (await import(filePath.href))?.default;
        if ("data" in command) {
          content += `\`/${command.data.name}\` : ${command.data.description} \n`;
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      }
    }

    interaction.reply({ content, flags: MessageFlags.Ephemeral });
  },
};
