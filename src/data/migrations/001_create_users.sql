CREATE TABLE IF NOT EXISTS users (
    discordId VARCHAR(255) PRIMARY KEY UNIQUE,
    guildId VARCHAR(255) NOT NULL,
    lastAction TIMESTAMP NOT NULL,
    lastRedeemed TIMESTAMP DEFAULT NULL,
    timesBet INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_currencies (
    discordId VARCHAR(255) NOT NULL,
    guildId VARCHAR(255) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('balance', 'won', 'lost')),
    tzapi INTEGER NOT NULL DEFAULT 0,
    nicu INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (discordId, type),
    FOREIGN KEY (discordId) REFERENCES users(discordId) ON DELETE CASCADE
);