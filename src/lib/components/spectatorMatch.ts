import { HTMLString, Lane } from "../types/common.js";
import { AccountData, SpectatorPerks } from "../types/riot.js";
import {
  colorByWinrate,
  getChampionSrc,
  getPerkSrc,
  getSummonerSpellSrc,
  guessTeamLanes,
} from "../utils/game.js";

export type Player = {
  rankedStats?: AccountData | undefined;
  teamId: number;
  riotId: string;
  championId: number;
  spell1Id: number;
  spell2Id: number;
};

export type ParticipantStats = {
  rankedStats?: AccountData | undefined;
  teamId: number;
  riotId: string;
  championId: number;
  spell1Id: number;
  spell2Id: number;
  perks: SpectatorPerks;
  weights: { [key in Lane]?: number };
};

export function LiveGameHTML(
  participantsStats: ParticipantStats[]
): HTMLString {
  const blueSideParticipants = guessTeamLanes(participantsStats.slice(0, 5));
  const redSideParticipants = guessTeamLanes(participantsStats.slice(5, 10));

  return `<!DOCTYPE html>
  <html lang="en" style="font-family: sans-serif;">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>League Live Match</title>
    </head>
    <body style="display: flex; margin: 0; padding: 0.5rem; background-color: #303238; color: #dddddd">
      <div style="width: 50%; display: flex; flex-direction: column; gap: 0.5rem">
        <div style="font-size:40px; font-weight:bold; color: #5383E8;">
          Blue Team
        </div>
        ${blueSideParticipants
          .map((p) => {
            return PlayerCard(p);
          })
          .join("")}
      </div>

      <div style="width: 50%; display: flex; flex-direction: column; gap: 0.5rem">
        <div style="font-size:40px; font-weight:bold; color: #E84057">
          Red Team
        </div>
        ${redSideParticipants
          .map((p) => {
            return PlayerCard(p);
          })
          .join("")}
      </div>
    </body>
  </html>
  `;
}

function PlayerCard(participant: ParticipantStats) {
  const { championId, spell1Id, spell2Id, rankedStats, riotId } = participant;

  return `
  <article style="display: flex; gap: 0.5rem; align-items: center;">
    <img src="${getChampionSrc(championId)}" 
      alt="" 
      width="128px" 
      height="128px" 
    />
    <div style="display: flex; flex-direction: column; justify-content: space-between;">
      <img src="${getSummonerSpellSrc(spell1Id)}" width="60px" height="60px" />
      <img src="${getSummonerSpellSrc(spell2Id)}" width="60px" height="60px" />
    </div>

    <div style="display: flex; flex-direction: column; justify-content: space-between;">
      <img src="${getPerkSrc(participant.perks.perkIds[0])}" 
        width="60px" 
        height="60px" 
        style="
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 50%;" 
      />
      <img src="${getPerkSrc(participant.perks.perkSubStyle)}" 
        width="60px" 
        height="60px" 
        style="
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 50%;" 
      />
    </div>
  
    ${DivisionArticle(riotId, rankedStats)}
  
    ${RankedArticle(rankedStats)}
  </article>`;
}

function DivisionArticle(riotId: string, rankedStats?: AccountData) {
  let division = "Unranked";

  if (rankedStats) {
    const { tier, rank, leaguePoints } = rankedStats;
    division = `${tier}${rank ? ` ${rank} ` : ""} (${leaguePoints} LP)`;
  }
  return `
    <div style="display: flex; flex-direction: column; gap:0.5rem; width: 100%; max-width:320px;">
      <div style="height: 50%; position: relative;">  
        <p style="font-size:1.5rem; margin: 0; position: absolute; bottom: 0;">
          ${riotId}
        </p>
      </div>
      <div style="height: 50%; position: relative;">  
        <p style="font-size:1.5rem; margin: 0; position: absolute; top: 0;">
          ${division}
        </p>
      </div>
    </div>
    `;
}

function RankedArticle(rankedStats?: AccountData) {
  if (!rankedStats) {
    return "";
  }

  const { wins, losses } = rankedStats;

  const totalGames = (wins ?? 0) + (losses ?? 0);
  const winrate = Math.floor(((wins ?? 0) / totalGames) * 100);
  let color = colorByWinrate(winrate);
  const width = 180;

  return `
  <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%; font-size: 1.5rem; position: relative; height: 100%;">
    <div style="height:50%; position: relative;">  
      <p style="position: absolute; bottom: 0; margin: 0;">
        <span style="color: ${color}; font-weight: bold;">${winrate}%</span>${" "}
        <span>(${totalGames} Played)</span>
      </p>
    </div>

    <div style="height:50%; position: relative;">  
      <div style="width: ${width}px; background-color: rgba(131, 131, 131, 0.3); height: 0.7rem; border-radius: 9px; box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px; position:absolute; top: 0;">
        <div style="width: ${
          (width * winrate) / 100
        }px; background-color: ${color}; height: 0.7rem; border-radius: 9px;">
        </div>
      </div>  
    </div>
  </div>`;
}
