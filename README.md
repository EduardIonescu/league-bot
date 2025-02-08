# League of Legends Predictions Bot

This Discord bot allows you and your friends to predict the outcome of your League of Legends ranked games and get rewarded if right. Built using Discord.js, TypeScript, Node.js, SQLite, and Puppeteer, it automates the predicting process and provides a fun way to engage with your server.

## Features

*   **Player Registration:** Use `/add <summoner_name>` to add League accounts with the bot.
*   **Game Detection:** The `/check` command scans registered players' profiles to detect if they are currently in a ranked game.
*   **Predictions:** Once a game is detected, interactive buttons are displayed, allowing users to make predictions on the match outcome.
*   **Automated Results:** The bot tracks game outcomes and automatically calculates and distributes points based on the predictions made.
*   **Game Summary Image:** After a game ends, a button lets you generate an image summarizing the game's stats (damage, scores, etc.) using Puppeteer.
*   **Leaderboard:** View the leaderboard to see who's on top! (`/leaderboard`).
*   **Utility:** Check your current balance (`/balance`), give others some of your winnings (`/give`) or redeem some once you've become broke (`/redeem`).

## Technologies Used

*   **Discord.js:** For Discord bot functionality.
*   **TypeScript:** For type safety and code maintainability.
*   **Node.js:** JavaScript runtime.
*   **SQLite:** Lightweight database.
*   **Puppeteer:**  Generates dynamic game summary images.

## Adding the Bot to Your Server

You can add the bot to your Discord server using this link:

[Invite Link](https://discord.com/oauth2/authorize?client_id=1325151673026482347)

## Usage

Use the `/help` command for a detailed list of commands and how to use them.  This will provide information on registering players, checking for games, making predictions, viewing the leaderboard, and other available features. 
The bot also uses interactive buttons for placing predictions and generating game summaries.

## Installation ( For Self-Hosting )

If you'd like to run the bot yourself:

1.  **Clone the repository:** `git clone https://github.com/EduardIonescu/league-bot/`
2.  **Install dependencies:** `pnpm install`
3.  **Configure the bot:**
    *   Create a `.env` file in the root directory.
    *   Add the necessary environment variables (see `.env.example` for details). You'll need:
        *   `APP_ID=<your_discord_app_id>` ( discord.com/developers/applications/<app_id>/information )
        *   `PUBLIC_KEY=<your_discord_public_key>` ( discord.com/developers/applications/<app_id>/information )
        *   `DISCORD_TOKEN=<your_bot_token>` ( discord.com/developers/applications/<app_id>/bot )
        *   `LEAGUE_API=<your_riot_api_key>` ( You will need to ask Riot for one at [developer.riotgames.com/apis](https://developer.riotgames.com/apis))
4.  **Bot Permissions:** **Bot Permissions:** Ensure you grant it the necessary permissions ( discord.com/developers/applications/<app_id>/installation ):
![image](https://github.com/user-attachments/assets/1d69a550-2aa2-45ea-a6a2-1e591bb72a06)

6.  **Run the bot:** `pnpm run start`

## TODO

*   Reduce the size of the screenshots taken by Puppeteer.
*   Consider removing support for Flex games.
*   Disable buttons when they should no longer be usable.

