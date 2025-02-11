BEGIN TRANSACTION;  

ALTER TABLE accounts RENAME TO accounts_old;

CREATE TABLE IF NOT EXISTS accounts (
    summonerPUUID VARCHAR(255) NOT NULL,
    guildId VARCHAR(255) NOT NULL,
    gameName VARCHAR(255) NOT NULL,
    tagLine VARCHAR(255) NOT NULL,
    region VARCHAR(255) NOT NULL,
    PRIMARY KEY (summonerPUUID, guildId)
);

INSERT INTO accounts (summonerPUUID, guildId, gameName, tagLine, region)
SELECT summonerPUUID, '761981700942987284', gameName, tagLine, region
FROM accounts_old;

DROP TABLE accounts_old;

COMMIT TRANSACTION;
