ALTER TABLE bets RENAME TO bets_old;

CREATE TABLE bets (
  discordId VARCHAR(255) NOT NULL,
  guildId VARCHAR(255) NOT NULL,
  gameId INTEGER NOT NULL,
  tzapi INTEGER,
  nicu INTEGER,
  win BOOLEAN NOT NULL CHECK (win IN (0, 1)),
  timestamp TIMESTAMP NOT NULL,
  PRIMARY KEY (discordId, timestamp),
  FOREIGN KEY (gameId) REFERENCES activeMatches(gameId) ON DELETE CASCADE
);

DROP TABLE bets_old;
