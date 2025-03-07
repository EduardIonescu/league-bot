CREATE TABLE IF NOT EXISTS finishedMatches(
  gameId INTEGER PRIMARY KEY NOT NULL,
  player VARCHAR(255) NOT NULL,
  gameType VARCHAR(255) NOT NULL,
  gameMode VARCHAR(255) NOT NULL,
  gameQueueConfigId INTEGER NOT NULL,
  summonerPUUID VARCHAR(255) NOT NULL,
  inGameTime INTEGER NOT NULL,
  gameStartTime INTEGER NOT NULL,
  region VARCHAR(255) NOT NULL,
  gameDuration INTEGER NOT NULL,
  win BOOLEAN NOT NULL CHECK (win IN (0, 1)),
  remake BOOLEAN CHECK (remake IN (0, 1)),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finishedMatchParticipants (
  gameId INTEGER NOT NULL,
  puuid VARCHAR(255) NOT NULL,
  kills INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  deaths INTEGER NOT NULL,
  totalDamageDealtToChampions INTEGER NOT NULL,
  teamPosition VARCHAR(255) NOT NULL, 
  championId INTEGER NOT NULL,
  champLevel INTEGER NOT NULL,
  summoner1Id INTEGER NOT NULL,
  summoner2Id INTEGER NOT NULL,
  totalMinionsKilled INTEGER NOT NULL,
  neutralMinionsKilled INTEGER NOT NULL,
  item0 INTEGER NOT NULL,
  item1 INTEGER NOT NULL,
  item2 INTEGER NOT NULL,
  item3 INTEGER NOT NULL,
  item4 INTEGER NOT NULL,
  item5 INTEGER NOT NULL,
  item6 INTEGER NOT NULL,
  perks JSONB NOT NULL,
  gameName VARCHAR(255) NOT NULL,
  tagLine VARCHAR(255) NOT NULL,
  teamId INTEGER NOT NULL,
  win BOOLEAN NOT NULL CHECK (win IN (0, 1)),
  PRIMARY KEY (puuid, gameId),
  FOREIGN KEY (gameId) REFERENCES finishedMatches(gameId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finishedBets(
  discordId VARCHAR(255) NOT NULL,
  gameId INTEGER NOT NULL,
  tzapi INTEGER,
  nicu INTEGER,
  win BOOLEAN NOT NULL CHECK (win IN (0, 1)),
  timestamp TIMESTAMP NOT NULL,
  PRIMARY KEY (discordId, timestamp),
  FOREIGN KEY (gameId) REFERENCES finishedMatches(gameId) ON DELETE CASCADE
);