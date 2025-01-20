import { REST, Routes } from "discord.js";
import * as fs from "node:fs";

import * as dotenv from "dotenv";
dotenv.config();

const commands = [];

const commandFolderPath = "../dist/commands/";
const absoluteCommandsPath = new URL(commandFolderPath, import.meta.url);
const commandFolders = fs.readdirSync(absoluteCommandsPath);

for (const folder of commandFolders) {
  // Grab all the command files from the commands directory you created earlier
  const folderPath = new URL(folder + "/", absoluteCommandsPath);
  const commandFiles = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".js"));

  console.log(folder, commandFiles);
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = new URL(file, folderPath);
    const command = (await import(filePath.href))?.default;
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    const data = await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (err) {
    console.error(err);
  }
})();
