DROP TABLE activeMatches;
DROP TABLE bets;
DROP TABLE messages;

CREATE TABLE IF NOT EXISTS activeMatches(
  gameId INTEGER NOT NULL,
  guildId VARCHAR(255) NOT NULL,
  player VARCHAR(255) NOT NULL,
  gameType VARCHAR(255) NOT NULL,
  gameMode VARCHAR(255) NOT NULL,
  gameQueueConfigId INTEGER NOT NULL,
  summonerPUUID VARCHAR(255) NOT NULL,
  inGameTime INTEGER NOT NULL,
  gameStartTime INTEGER NOT NULL,
  region VARCHAR(255) NOT NULL,
  PRIMARY KEY (summonerPUUID, guildId)
);

CREATE TABLE IF NOT EXISTS bets (
  discordId VARCHAR(255) NOT NULL,
  guildId VARCHAR(255) NOT NULL,
  gameId INTEGER NOT NULL,
  tzapi INTEGER,
  nicu INTEGER,
  win BOOLEAN NOT NULL CHECK (win IN (0, 1)),
  timestamp TIMESTAMP NOT NULL,
  PRIMARY KEY (discordId, timestamp, guildId),
  FOREIGN KEY (gameId, guildId) REFERENCES activeMatches(gameId, guildId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages(
  messageId VARCHAR(255) PRIMARY KEY,
  guildId VARCHAR(255) NOT NULL,
  channelId VARCHAR(255) NOT NULL,
  gameId INTEGER NOT NULL,
  FOREIGN KEY (gameId, guildId) REFERENCES activeMatches(gameId, guildId) ON DELETE CASCADE
);