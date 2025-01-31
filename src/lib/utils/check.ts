import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  time,
  TimestampStyles,
} from "discord.js";
import { Account, SpectatorParticipant } from "../types/riot.js";
import { formatPlayerName, getAccounts } from "./game.js";
import { getSpectatorData } from "./riot.js";

export async function check(
  interaction: CommandInteraction | ButtonInteraction
) {
  await interaction.deferReply();

  const { error, accounts } = await getAccounts();

  if (error || !accounts || accounts.length === 0) {
    await interaction.editReply(
      "No accounts are saved. Try saving some accounts first with `/add`"
    );

    return;
  }

  const accountsInGame: (Account & {
    gameStartTime: number;
    participants: SpectatorParticipant[];
    gameMode: string;
  })[] = [];
  for (const account of accounts) {
    const { error, spectatorData } = await getSpectatorData(
      account.summonerPUUID,
      account.region
    );

    if (error || !spectatorData) {
      continue;
    }

    accountsInGame.push({
      ...account,
      gameStartTime: spectatorData.gameStartTime,
      participants: spectatorData.participants,
      gameMode: spectatorData.gameMode,
    });
  }

  if (!accountsInGame || accountsInGame.length === 0) {
    await interaction.editReply("No players are in game right now.");

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
    await interaction.editReply({
      content: msg.join("\n"),
      components: playerButtonsColumns,
    });

    return;
  }

  await interaction.editReply({
    content: msg.join("\n"),
  });
  return;
}

export function getCheckButton(primary: boolean = true) {
  return new ButtonBuilder()
    .setLabel("Check Live Games")
    .setCustomId("check")
    .setStyle(primary ? ButtonStyle.Primary : ButtonStyle.Secondary);
}
