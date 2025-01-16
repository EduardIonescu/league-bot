import summonerSpells from "./assets/summonerSpells.js";
import { AccountData } from "./types.js";

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
};

export function LiveGameHTML(participantsStats: ParticipantStats[]) {
  return `<!DOCTYPE html>
  <html lang="en">
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
        ${participantsStats
          .slice(0, 5)
          .map((p) => {
            return PlayerCard(p);
          })
          .join("")}
      </div>

      <div style="width: 50%; display: flex; flex-direction: column; gap: 0.5rem">
        <div style="font-size:40px; font-weight:bold; color: #E84057">
          Red Team
        </div>
        ${participantsStats
          .slice(5, 10)
          .map((p) => {
            return PlayerCard(p);
          })
          .join("")}
      </div>
    </body>
  </html>
  `;
}

function PlayerCard(player: Player) {
  const { championId, spell1Id, spell2Id, rankedStats, riotId } = player;

  return `
  <article style="display: flex; gap: 0.5rem; align-items: center;">
    <img src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png" alt="" width="128px" height="128px" />
    <div style="display: flex; flex-direction: column; justify-content: space-between;">
      <img src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/spell/${
        summonerSpells[spell1Id].id
      }.png" alt="" width="60px" height="60px" />
      <img src="https://ddragon.leagueoflegends.com/cdn/15.1.1/img/spell/${
        summonerSpells[spell2Id].id
      }.png" alt="" width="60px" height="60px" />
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

  return `
  <div style="display: flex; flex-direction: column; gap: 0.25rem; width: 100%; font-size: 1.5rem;">
    <p>
      <span style="color: ${color}; font-weight: bold;">${winrate}%</span>${" "}
      <span>(${totalGames} Played)</span>
    </p>`;
}

function colorByWinrate(winrate: number) {
  if (winrate < 30) {
    // Red
    return "#B71C1C";
  }
  if (winrate < 50) {
    // Gray
    return "#838383";
  }
  if (winrate < 60) {
    // Green
    return "#43A047";
  }
  if (winrate < 70) {
    // Blue
    return "#1E88E5";
  }

  // Orange
  return "#FB8C00";
}
