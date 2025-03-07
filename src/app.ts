import { Client, Collection, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
dotenv.config();

export interface ClientWithCommands extends Client<boolean> {
  commands: Collection<string, any>;
  cooldowns: Collection<string, any>;
}
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as ClientWithCommands;
client.commands = new Collection();
client.cooldowns = new Collection();

(async () => {
  const commandFolderPath = "./commands/";
  const absoluteCommandsPath = new URL(commandFolderPath, import.meta.url);
  const commandFolders = fs.readdirSync(absoluteCommandsPath);

  for (const folder of commandFolders) {
    const folderPath = new URL(folder + "/", absoluteCommandsPath);
    const commandFiles = fs.readdirSync(folderPath);

    for (const file of commandFiles) {
      const filePath = new URL(file, folderPath);
      const command = (await import(filePath.href))?.default;
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }

  const eventsPath = new URL("./events/", import.meta.url);
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = new URL(file, eventsPath);
    const event = (await import(filePath.href)).default;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }

  await client.login(process.env.DISCORD_TOKEN);
})();
