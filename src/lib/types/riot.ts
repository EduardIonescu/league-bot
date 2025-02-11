export type RegionRiot = "americas" | "europe";
export type Region = "eun1" | "euw1" | "na1";
export type SummonerData = { puuid: string; gameName: string; tagLine: string };
export type Account = {
  gameName: string;
  guildId: string;
  tagLine: string;
  summonerPUUID: string;
  region: Region;
};

export type MatchResult = {
  metadata: Metadata;
  info: Info;
};

export type Metadata = {
  dataVersion: string;
  matchId: string;
  participants: string[];
};

export type Info = {
  endOfGameResult: string;
  gameCreation: number;
  gameDuration: number;
  gameEndTimestamp: number;
  gameId: number;
  gameMode: string;
  gameName: string;
  gameStartTimestamp: number;
  gameType: string;
  gameVersion: string;
  mapId: number;
  participants: Participant[];
  platformId: string;
  queueId: number;
  teams: Team[];
  tournamentCode: string;
};

export type Participant = {
  allInPings: number;
  assistMePings: number;
  assists: number;
  baronKills: number;
  basicPings: number;
  bountyLevel: number;
  challenges: Challenges;
  champExperience: number;
  champLevel: number;
  championId: number;
  championName: string;
  championTransform: number;
  commandPings: number;
  consumablesPurchased: number;
  damageDealtToBuildings: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
  damageSelfMitigated: number;
  dangerPings: number;
  deaths: number;
  detectorWardsPlaced: number;
  doubleKills: number;
  dragonKills: number;
  eligibleForProgression: boolean;
  enemyMissingPings: number;
  enemyVisionPings: number;
  firstBloodAssist: boolean;
  firstBloodKill: boolean;
  firstTowerAssist: boolean;
  firstTowerKill: boolean;
  gameEndedInEarlySurrender: boolean;
  gameEndedInSurrender: boolean;
  getBackPings: number;
  goldEarned: number;
  goldSpent: number;
  holdPings: number;
  individualPosition: string;
  inhibitorKills: number;
  inhibitorTakedowns: number;
  inhibitorsLost: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  itemsPurchased: number;
  killingSprees: number;
  kills: number;
  lane: string;
  largestCriticalStrike: number;
  largestKillingSpree: number;
  largestMultiKill: number;
  longestTimeSpentLiving: number;
  magicDamageDealt: number;
  magicDamageDealtToChampions: number;
  magicDamageTaken: number;
  missions: Missions;
  needVisionPings: number;
  neutralMinionsKilled: number;
  nexusKills: number;
  nexusLost: number;
  nexusTakedowns: number;
  objectivesStolen: number;
  objectivesStolenAssists: number;
  onMyWayPings: number;
  participantId: number;
  pentaKills: number;
  perks: Perks;
  physicalDamageDealt: number;
  physicalDamageDealtToChampions: number;
  physicalDamageTaken: number;
  placement: number;
  playerAugment1: number;
  playerAugment2: number;
  playerAugment3: number;
  playerAugment4: number;
  playerAugment5: number;
  playerAugment6: number;
  playerSubteamId: number;
  profileIcon: number;
  pushPings: number;
  puuid: string;
  quadraKills: number;
  retreatPings: number;
  riotIdGameName: string;
  riotIdTagline: string;
  role: string;
  sightWardsBoughtInGame: number;
  spell1Casts: number;
  spell2Casts: number;
  spell3Casts: number;
  spell4Casts: number;
  subteamPlacement: number;
  summoner1Casts: number;
  summoner1Id: number;
  summoner2Casts: number;
  summoner2Id: number;
  summonerId: string;
  summonerLevel: number;
  summonerName: string;
  teamEarlySurrendered: boolean;
  teamId: number;
  teamPosition: string;
  timeCCingOthers: number;
  timePlayed: number;
  totalAllyJungleMinionsKilled: number;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  totalDamageShieldedOnTeammates: number;
  totalDamageTaken: number;
  totalEnemyJungleMinionsKilled: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  totalMinionsKilled: number;
  totalTimeCCDealt: number;
  totalTimeSpentDead: number;
  totalUnitsHealed: number;
  tripleKills: number;
  trueDamageDealt: number;
  trueDamageDealtToChampions: number;
  trueDamageTaken: number;
  turretKills: number;
  turretTakedowns: number;
  turretsLost: number;
  unrealKills: number;
  visionClearedPings: number;
  visionScore: number;
  visionWardsBoughtInGame: number;
  wardsKilled: number;
  wardsPlaced: number;
  win: boolean;
};

export type Challenges = {
  "12AssistStreakCount": number;
  HealFromMapSources: number;
  InfernalScalePickup: number;
  SWARM_DefeatAatrox: number;
  SWARM_DefeatBriar: number;
  SWARM_DefeatMiniBosses: number;
  SWARM_EvolveWeapon: number;
  SWARM_Have3Passives: number;
  SWARM_KillEnemy: number;
  SWARM_PickupGold: number;
  SWARM_ReachLevel50: number;
  SWARM_Survive15Min: number;
  SWARM_WinWith5EvolvedWeapons: number;
  abilityUses: number;
  acesBefore15Minutes: number;
  alliedJungleMonsterKills: number;
  baronTakedowns: number;
  blastConeOppositeOpponentCount: number;
  bountyGold: number;
  buffsStolen: number;
  completeSupportQuestInTime: number;
  controlWardsPlaced: number;
  damagePerMinute: number;
  damageTakenOnTeamPercentage: number;
  dancedWithRiftHerald: number;
  deathsByEnemyChamps: number;
  dodgeSkillShotsSmallWindow: number;
  doubleAces: number;
  dragonTakedowns: number;
  earliestBaron: number;
  earliestDragonTakedown?: number;
  earlyLaningPhaseGoldExpAdvantage: number;
  effectiveHealAndShielding: number;
  elderDragonKillsWithOpposingSoul: number;
  elderDragonMultikills: number;
  enemyChampionImmobilizations: number;
  enemyJungleMonsterKills: number;
  epicMonsterKillsNearEnemyJungler: number;
  epicMonsterKillsWithin30SecondsOfSpawn: number;
  epicMonsterSteals: number;
  epicMonsterStolenWithoutSmite: number;
  firstTurretKilled: number;
  fistBumpParticipation: number;
  flawlessAces: number;
  fullTeamTakedown: number;
  gameLength: number;
  getTakedownsInAllLanesEarlyJungleAsLaner?: number;
  goldPerMinute: number;
  hadOpenNexus: number;
  highestChampionDamage?: number;
  immobilizeAndKillWithAlly: number;
  initialBuffCount: number;
  initialCrabCount: number;
  jungleCsBefore10Minutes: number;
  junglerTakedownsNearDamagedEpicMonster: number;
  kTurretsDestroyedBeforePlatesFall: number;
  kda: number;
  killAfterHiddenWithAlly: number;
  killParticipation: number;
  killedChampTookFullTeamDamageSurvived: number;
  killingSprees: number;
  killsNearEnemyTurret: number;
  killsOnOtherLanesEarlyJungleAsLaner?: number;
  killsOnRecentlyHealedByAramPack: number;
  killsUnderOwnTurret: number;
  killsWithHelpFromEpicMonster: number;
  knockEnemyIntoTeamAndKill: number;
  landSkillShotsEarlyGame: number;
  laneMinionsFirst10Minutes: number;
  laningPhaseGoldExpAdvantage: number;
  legendaryCount: number;
  legendaryItemUsed: number[];
  lostAnInhibitor: number;
  maxCsAdvantageOnLaneOpponent: number;
  maxKillDeficit: number;
  maxLevelLeadLaneOpponent: number;
  mejaisFullStackInTime: number;
  moreEnemyJungleThanOpponent: number;
  multiKillOneSpell: number;
  multiTurretRiftHeraldCount: number;
  multikills: number;
  multikillsAfterAggressiveFlash: number;
  outerTurretExecutesBefore10Minutes: number;
  outnumberedKills: number;
  outnumberedNexusKill: number;
  perfectDragonSoulsTaken: number;
  perfectGame: number;
  pickKillWithAlly: number;
  playedChampSelectPosition?: number;
  poroExplosions: number;
  quickCleanse: number;
  quickFirstTurret: number;
  quickSoloKills: number;
  riftHeraldTakedowns: number;
  saveAllyFromDeath: number;
  scuttleCrabKills: number;
  skillshotsDodged: number;
  skillshotsHit: number;
  snowballsHit: number;
  soloBaronKills: number;
  soloKills: number;
  stealthWardsPlaced: number;
  survivedSingleDigitHpCount: number;
  survivedThreeImmobilizesInFight: number;
  takedownOnFirstTurret: number;
  takedowns: number;
  takedownsAfterGainingLevelAdvantage: number;
  takedownsBeforeJungleMinionSpawn: number;
  takedownsFirstXMinutes: number;
  takedownsInAlcove: number;
  takedownsInEnemyFountain: number;
  teamBaronKills: number;
  teamDamagePercentage: number;
  teamElderDragonKills: number;
  teamRiftHeraldKills: number;
  tookLargeDamageSurvived: number;
  turretPlatesTaken: number;
  turretTakedowns: number;
  turretsTakenWithRiftHerald: number;
  twentyMinionsIn3SecondsCount: number;
  twoWardsOneSweeperCount: number;
  unseenRecalls: number;
  visionScoreAdvantageLaneOpponent: number;
  visionScorePerMinute: number;
  voidMonsterKill: number;
  wardTakedowns: number;
  wardTakedownsBefore20M: number;
  wardsGuarded: number;
  controlWardTimeCoverageInRiverOrEnemyHalf?: number;
  junglerKillsEarlyJungle?: number;
  killsOnLanersEarlyJungleAsJungler?: number;
  shortestTimeToAceFromFirstTakedown?: number;
  fasterSupportQuestCompletion?: number;
  baronBuffGoldAdvantageOverThreshold?: number;
  firstTurretKilledTime?: number;
  highestCrowdControlScore?: number;
  highestWardKills?: number;
};

export type Missions = {
  playerScore0: number;
  playerScore1: number;
  playerScore2: number;
  playerScore3: number;
  playerScore4: number;
  playerScore5: number;
  playerScore6: number;
  playerScore7: number;
  playerScore8: number;
  playerScore9: number;
  playerScore10: number;
  playerScore11: number;
};

export type Perks = {
  statPerks: StatPerks;
  styles: Style[];
};

export type StatPerks = {
  defense: number;
  flex: number;
  offense: number;
};

export type Style = {
  description: string;
  selections: Selection[];
  style: number;
};

export type Selection = {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
};

export type Team = {
  bans: Ban[];
  objectives: Objectives;
  teamId: number;
  win: boolean;
};

export type Ban = {
  championId: number;
  pickTurn: number;
};

export type Objectives = {
  baron: Baron;
  champion: Champion;
  dragon: Dragon;
  horde: Horde;
  inhibitor: Inhibitor;
  riftHerald: RiftHerald;
  tower: Tower;
};

export type Baron = {
  first: boolean;
  kills: number;
};

export type Champion = {
  first: boolean;
  kills: number;
};

export type Dragon = {
  first: boolean;
  kills: number;
};

export type Horde = {
  first: boolean;
  kills: number;
};

export type Inhibitor = {
  first: boolean;
  kills: number;
};

export type RiftHerald = {
  first: boolean;
  kills: number;
};

export type Tower = {
  first: boolean;
  kills: number;
};

export type FailedRequest = {
  status: {
    message: string;
    status_code: number;
  };
};

// SPECTATOR
export type SpectatorData = {
  gameId: number;
  mapId: number;
  gameMode: string;
  gameType: string;
  gameQueueConfigId: number;
  participants: SpectatorParticipant[];
  observers: Observers;
  platformId: string;
  bannedChampions: BannedChampion[];
  gameStartTime: number;
  gameLength: number;
};

export type SpectatorParticipant = {
  puuid: string;
  teamId: number;
  spell1Id: number;
  spell2Id: number;
  championId: number;
  profileIconId: number;
  riotId: string;
  bot: boolean;
  summonerId: string;
  gameCustomizationObjects: any[];
  perks: SpectatorPerks;
};

export type SpectatorPerks = {
  perkIds: number[];
  perkStyle: number;
  perkSubStyle: number;
};

export type Observers = {
  encryptionKey: string;
};

export type BannedChampion = {
  championId: number;
  teamId: number;
  pickTurn: number;
};

// League Entries API
export type AccountData = {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
};
[];
