import { DatabaseSync } from "node:sqlite";

const rootPath = import.meta.url.split("dist/")[0];
const databasePath = new URL("src/data/database.db", rootPath);

const db = new DatabaseSync(databasePath.pathname);

export default db;
