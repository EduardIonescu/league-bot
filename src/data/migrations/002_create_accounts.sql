CREATE TABLE IF NOT EXISTS accounts (
    summonerPUUID VARCHAR(255) NOT NULL,
    guildId VARCHAR(255) NOT NULL,
    gameName VARCHAR(255) NOT NULL,
    tagLine VARCHAR(255) NOT NULL,
    region VARCHAR(255) NOT NULL,
    PRIMARY KEY (summonerPUUID, guildId)
);