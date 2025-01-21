import * as fs from "node:fs/promises";

export function toTitleCase(str: string) {
  return str
    .toLocaleLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDate(date: Date) {
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

export async function filePathExists(filePath: URL) {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
}
