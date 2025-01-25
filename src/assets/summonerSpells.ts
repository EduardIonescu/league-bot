import { SummonerSpell } from "../lib/types/common";

export default {
  21: {
    key: 21,
    name: "Barrier",
    id: "SummonerBarrier",
    weights: { bot: 0.3, support: 0.2, mid: 0.3 },
  },
  1: {
    key: 1,
    name: "Cleanse",
    id: "SummonerBoost",
    weights: { bot: 0.4, mid: 0.2 },
  },
  14: {
    key: 14,
    name: "Ignite",
    id: "SummonerDot",
    weights: { mid: 0.3, support: 0.3, top: 0.3 },
  },
  3: {
    key: 3,
    name: "Exhaust",
    id: "SummonerExhaust",
    weights: { support: 0.3, mid: 0.2, bot: 0.1 },
  },
  4: {
    key: 4,
    name: "Flash",
    id: "SummonerFlash",
    weights: { bot: 0.3, support: 0.3, mid: 0.3 },
  },
  6: {
    key: 6,
    name: "Ghost",
    id: "SummonerHaste",
    weights: { top: 0.3, mid: 0.3 },
  },
  7: {
    key: 7,
    name: "Heal",
    id: "SummonerHeal",
    weights: { bot: 0.2, support: 0.3 },
  },
  13: {
    key: 13,
    name: "Clarity",
    id: "SummonerMana",
    weights: { bot: 0.3, mid: 0.1 },
  },
  11: {
    key: 11,
    name: "Smite",
    id: "SummonerSmite",
    weights: { jungle: 100 },
  },
  12: {
    key: 12,
    name: "Teleport",
    id: "SummonerTeleport",
    weights: { bot: 0.1, top: 0.4, mid: 0.4 },
  },
} as { [key: number]: SummonerSpell };
