import { BLUE_TEAM_ID } from "../constants.js";
import { FinishedMatchParticipant, HTMLString } from "../types/common.js";
import { Style } from "../types/riot.js";
import {
  colorByKDA,
  formatPlayerName,
  getChampionSrc,
  getItemSrc,
  getPerkSrc,
  getSummonerSpellSrc,
} from "../utils/game.js";

export function FinishedMatchHTML(
  participants: FinishedMatchParticipant[],
  gameDuration: number
): HTMLString {
  const { win, teamId } = participants[0];
  const firstTeam = {
    name: teamId === BLUE_TEAM_ID ? "Blue team" : "Red team",
    backgroundColor: win
      ? "linear-gradient(rgba(48, 69, 201, .1), rgba(48, 69, 201, .2))"
      : "linear-gradient(hsla(3, 91%, 67%, .1), hsla(3, 91%, 67%, .2))",
    color: win ? "#4A90E2" : "#E63946",
    outcome: win ? "Victory" : "Defeat",
  };
  const secondTeam = {
    name: teamId === BLUE_TEAM_ID ? "Red team" : "Blue team",
    backgroundColor: win
      ? "linear-gradient(hsla(3, 91%, 67%, .1), hsla(3, 91%, 67%, .2))"
      : "linear-gradient(rgba(48, 69, 201, .1), rgba(48, 69, 201, .2))",
    color: win ? "#E63946" : "#4A90E2",
    outcome: win ? "Defeat" : "Victory",
  };

  const highestDamage = participants.reduce(
    (acc, cur) =>
      cur.totalDamageDealtToChampions > acc
        ? cur.totalDamageDealtToChampions
        : acc,
    0
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body
    style="
      display: flex;
      margin: 0;
      background-color: rgb(13, 15, 16);
      color: #dddddd;
      font-family: Roboto, sans-serif;
    "
  >
    <table style="width: 100%; border-spacing: 0;">
      <colgroup>
        <col width="60" />
        <col width="18" />
        <col width="18" />
        <col />
        <col width="68" />
        <col width="120" />
        <col width="56" />
        <col width="300" />
      </colgroup>

       <thead style="height: 3rem; font-size: 24px; opacity: 0.8">
        <tr>
          <th style="text-align: start; padding-left: 0.5rem" colspan="4">
            <span style="font-weight: 900; color: ${firstTeam.color}">${
    firstTeam.outcome
  }</span> (${firstTeam.name})
          </th>
          <th>KDA</th>
          <th>Damage</th>
          <th>CS</th>
          <th>Item</th>
        </tr>
      </thead>

      <tbody style="background: ${firstTeam.backgroundColor};">
       
      ${participants
        .slice(0, 5)
        .map((participant) => {
          return PlayerCard(participant, highestDamage, gameDuration);
        })
        .join("")}
      
      </tbody>
      
      <thead style="height: 3rem; font-size: 24px; opacity: 0.8">
        <tr>
          <th style="text-align: start; padding-left: 0.5rem" colspan="4">
            <span style="font-weight: 900; color: ${secondTeam.color}">${
    secondTeam.outcome
  }</span> (${secondTeam.name})
          </th>
          <th>KDA</th>
          <th>Damage</th>
          <th>CS</th>
          <th>Item</th>
        </tr>
      </thead>

      <tbody style="background: ${
        secondTeam.backgroundColor
      }; border-color: #703c47">
       
      ${participants
        .slice(5)
        .map((participant) => {
          return PlayerCard(participant, highestDamage, gameDuration);
        })
        .join("")}
      
      </tbody>

    </table>
  </body>
</html>
`;
}

function PlayerCard(
  participant: FinishedMatchParticipant,
  highestDamage: number,
  gameDuration: number
) {
  const {
    kills,
    assists,
    deaths,
    totalDamageDealtToChampions,
    championId,
    champLevel,
    summoner1Id,
    summoner2Id,
    totalMinionsKilled,
    neutralMinionsKilled,
    item0,
    item1,
    item2,
    item3,
    item4,
    item5,
    item6,
    perks,
    riotIdGameName,
    riotIdTagline,
  } = participant;
  const playerName = formatPlayerName(riotIdGameName, riotIdTagline);

  const damagePercentage = Math.min(
    Math.round((totalDamageDealtToChampions / highestDamage) * 100),
    100
  );

  const gameDurationMinutes = gameDuration / 60;
  const totalMinions = neutralMinionsKilled + totalMinionsKilled;

  const cpm = Math.round((totalMinions / gameDurationMinutes) * 10) / 10;

  return `
   <tr style="display: table-row; vertical-align: middle">
          <td
            style="
              padding-left: 10px;
              padding-right: 4px;
              vertical-align: middle;
            "
          >
            
            ${ChampionImage(champLevel, championId)}

          </td>
          <td style="padding: 6px 0px 3px; vertical-align: middle">
           
          ${SummonerSpellIcon(summoner1Id)}

          ${SummonerSpellIcon(summoner2Id)}
         
          </td>
          <td style="vertical-align: middle; padding-left: 4px">
            
            ${PerkIcon(perks.styles[0])}
            
            ${PerkIcon(perks.styles[1])}
            
          </td>
          <td style="padding-left: 4px; vertical-align: middle">
            <div
              style="
                position: relative;
                line-height: 14px;
                font-size: 18px;
                white-space: nowrap;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
              "
            >
              ${playerName}
            </div>
          </td>
          <td
            style="
              text-align: center;
              white-space: nowrap;
              padding-left: 4px;
              vertical-align: middle;
            "
          >

            ${KDA(kills, deaths, assists)}

          </td>
          <td style="padding-left: 4px; vertical-align: middle">
            <div style="position: relative">
              <div
                style="
                  text-align: center;
                  color: #8c8b9f;
                  font-size: 16px;
                  font-weight: 600;
                "
              >
                ${totalDamageDealtToChampions.toLocaleString()}
              </div>
              <div
                style="
                  width: 75px;
                  height: 8px;
                  margin: 4px auto;
                  background-color: #202127;
                  border-radius: 9px;
                  overflow: hidden;
                  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
                "
              >
                <div
                  style="
                    width: ${damagePercentage}%; 
                    height: 100%;
                    background-color: rgba(220, 10, 10, 0.8)
                  "
                ></div>
              </div>
            </div>
          </td>
          <td
            style="
              text-align: center;
              color: #8c8b9f;
              font-size: 16px;
              font-weight: 600;
              vertical-align: middle;
            "
          >
            <div>${totalMinions}</div>
            <div>${cpm}/m</div>
          </td>
          <td
            style="
              text-align: center;
              padding-left: 4px;
              vertical-align: middle;
            "
          >
            ${ItemIcon(item0)}
            ${ItemIcon(item1)}
            ${ItemIcon(item2)}
            ${ItemIcon(item3)}
            ${ItemIcon(item4)}
            ${ItemIcon(item5)}
            ${ItemIcon(item6, true)}
          </td>
        </tr>
        `;
}

function ChampionImage(level: number, id: number) {
  return `
  <div style="position: relative">
    <img
      style="
        display: block;
        border-radius: 6px;
        object-fit: cover;
        box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px,
          rgba(0, 0, 0, 0.24) 0px 1px 2px;
      "
      src="${getChampionSrc(id)}"
      width="64"
    />
    <div
      style="
        position: absolute;
        left: -10x;
        bottom: -1px;
        width: 20px;
        height: 20px;
        background: rgb(32, 45, 55);
        border-radius: 6px;
        color: rgb(255, 255, 255);
        font-size: 14px;
        text-align: center;
        line-height: 20px;
        box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px,
          rgba(0, 0, 0, 0.24) 0px 1px 2px;
      "
    >
      ${level}
    </div>
  </div>
  `;
}

function SummonerSpellIcon(id: number) {
  return `
  <div
    style="
      position: relative;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px,
        rgba(0, 0, 0, 0.24) 0px 1px 2px;
    "
  >
    <img
      src="${getSummonerSpellSrc(id)}"
      width="28"
    />
  </div>
  `;
}

function PerkIcon(perkStyle: Style) {
  let id;
  if (perkStyle.description === "primaryStyle") {
    // I want the main rune here e.g. Aftershock
    id = perkStyle.selections[0].perk;
  } else {
    // I want the secondary rune tree here e.g. Sorcery
    id = perkStyle.style;
  }

  return `
  <div style="position: relative">
    <img
      src="${getPerkSrc(id)}"
      width="28"
      style="
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 50%;
        box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px,
          rgba(0, 0, 0, 0.24) 0px 1px 2px;
      "
    />
  </div>
  `;
}

function KDA(kills: number, deaths: number, assists: number) {
  const kda = Math.floor(((kills + assists) / deaths) * 100) / 100;
  const kdaColor = colorByKDA(kda);
  return `
    <div style="color: #8c8b9f; font-size: 16px; font-weight: 600">
      ${kills}/${deaths}/${assists} (48%)
    </div>
    <div style="color: ${kdaColor}; font-weight: bold; font-size: 16px">
      ${kda}:1
    </div>
  `;
}

function ItemIcon(id: number, isTrinket: boolean = false) {
  return `
  <div
    style="
      display: inline-block;
      margin-left: 2px;
      vertical-align: middle;
      
    "
  >
    <div style="position: relative">
      <img
        src="${getItemSrc(id)}"
        style="border-radius: ${isTrinket ? "50%" : "6px"};
        box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px,
          rgba(0, 0, 0, 0.24) 0px 1px 2px;
        "
        width="32"
      />
    </div>
  </div>
  `;
}
