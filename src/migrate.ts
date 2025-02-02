import * as fs from "node:fs";
import db from "./data/db.js";

const rootPath = import.meta.url.split("dist/")[0];
const migrationDir = new URL("src/data/migrations/", rootPath);

fs.readdirSync(migrationDir).forEach((file) => {
  const migration = fs.readFileSync(new URL(file, migrationDir), "utf-8");
  db.exec(migration);
  console.log(`Applied migration: ${file}`);
});

console.log("All migrations applied!");
