BEGIN TRANSACTION;  

ALTER TABLE users RENAME TO users_old;
ALTER TABLE user_currencies RENAME TO user_currencies_old;

CREATE TABLE users (
    discordId VARCHAR(255) NOT NULL,
    guildId VARCHAR(255) NOT NULL,
    lastAction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastRedeemed TIMESTAMP DEFAULT NULL,
    timesBet INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (discordId, guildId)
);

CREATE TABLE user_currencies (
    discordId VARCHAR(255) NOT NULL,
    guildId VARCHAR(255) NOT NULL,  
    type TEXT NOT NULL CHECK (type IN ('balance', 'won', 'lost')),
    tzapi INTEGER NOT NULL DEFAULT 0,
    nicu INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (discordId, guildId, type),
    FOREIGN KEY (discordId, guildId) REFERENCES users(discordId, guildId) ON DELETE CASCADE

);

CREATE TEMP TABLE temp_col_check AS 
SELECT COUNT(*) AS col_exists FROM pragma_table_info('users_old') WHERE name = 'guildId';

INSERT INTO users (discordId, guildId, lastAction, lastRedeemed, timesBet, wins, losses)
SELECT discordId, guildId, lastAction, lastRedeemed, timesBet, wins, losses
FROM users_old
WHERE (SELECT col_exists FROM temp_col_check) > 0;

INSERT INTO users (discordId, guildId, lastAction, lastRedeemed, timesBet, wins, losses)
SELECT discordId, '761981700942987284', lastAction, lastRedeemed, timesBet, wins, losses
FROM users_old
WHERE (SELECT col_exists FROM temp_col_check) = 0;


INSERT INTO user_currencies (discordId, guildId, type, tzapi, nicu)
SELECT discordId, guildId, type, tzapi, nicu
FROM user_currencies_old
WHERE (SELECT col_exists FROM temp_col_check) > 0;

INSERT INTO user_currencies (discordId, guildId, type, tzapi, nicu)
SELECT discordId, '761981700942987284', type, tzapi, nicu
FROM user_currencies_old
WHERE (SELECT col_exists FROM temp_col_check) = 0;

DROP TABLE users_old;
DROP TABLE user_currencies_old;
DROP TABLE temp_col_check;

COMMIT TRANSACTION;