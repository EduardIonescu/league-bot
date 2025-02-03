import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  time,
  TimestampStyles,
} from "discord.js";
import { getAccounts } from "../db/account.js";
import { AccountInGame } from "../types/common.js";
import { handleDefer } from "./customReply.js";
import { formatPlayerName } from "./game.js";
import { fetchSpectatorData } from "./riot.js";

export async function check(
  interaction: CommandInteraction | ButtonInteraction
) {
  const deferHandler = handleDefer(interaction);
  deferHandler.start();

  const { error, accounts } = getAccounts();

  if (error || !accounts || accounts.length === 0) {
    await interaction.customReply(
      "No accounts are saved. Try saving some accounts first with `/add`"
    );
    deferHandler.cancel();

    return;
  }

  const accountsInGame: AccountInGame[] = (
    await Promise.all(
      accounts.map(async (account) => {
        const { error, spectatorData } = await fetchSpectatorData(
          account.summonerPUUID,
          account.region
        );

        if (error || !spectatorData) {
          return undefined;
        }

        return {
          ...account,
          gameStartTime: spectatorData.gameStartTime,
          participants: spectatorData.participants,
          gameMode: spectatorData.gameMode,
        };
      })
    )
  ).filter((data) => data !== undefined);

  if (!accountsInGame || accountsInGame.length === 0) {
    await interaction.customReply("No players are in game right now.");
    deferHandler.cancel();

    return;
  }

  const msg: string[] = [];
  const playerButtonsColumns: ActionRowBuilder<ButtonBuilder>[] = [];
  let playerButtonsRow = new ActionRowBuilder<ButtonBuilder>();
  for (const account of accountsInGame) {
    const player = formatPlayerName(account.gameName, account.tagLine);

    const isInGameMessage = "is in game since";
    const relativeTime = time(
      new Date(account.gameStartTime),
      TimestampStyles.RelativeTime
    );

    msg.push(`\`${player}\` ${isInGameMessage} ${relativeTime}`);

    /** Only allow summoners rift  */
    if (account.gameMode.toLowerCase() !== "Classic".toLowerCase()) {
      continue;
    }

    // Can only add 5 x 5 buttons to a message (use pagination if you want more)
    if (
      playerButtonsColumns.length === 5 &&
      playerButtonsRow.components.length === 5
    ) {
      continue;
    }

    const playerButton = new ButtonBuilder()
      .setLabel(player)
      .setCustomId(`check-${account.summonerPUUID}@${account.region}`)
      .setStyle(ButtonStyle.Primary);

    if (playerButtonsRow.components.length <= 4) {
      playerButtonsRow.addComponents(playerButton);
    } else {
      playerButtonsColumns.push(playerButtonsRow);
      playerButtonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        playerButton
      );
    }
  }
  playerButtonsColumns.push(playerButtonsRow);

  if (playerButtonsColumns.length) {
    await interaction.customReply({
      content: msg.join("\n"),
      components: playerButtonsColumns,
    });
    deferHandler.cancel();

    return;
  }

  await interaction.customReply({
    content: msg.join("\n"),
  });
  deferHandler.cancel();

  return;
}

export function getCheckButton(primary: boolean = true) {
  return new ButtonBuilder()
    .setLabel("Check Live Games")
    .setCustomId("check")
    .setStyle(primary ? ButtonStyle.Primary : ButtonStyle.Secondary);
}
