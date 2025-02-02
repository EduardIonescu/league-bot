import * as fsSync from "node:fs";
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

/** Cursed way to make discord customId less than 100 characters long(limit)  */
export const encodeBase1114111 = (str: string) => {
  let num = BigInt("0x" + Buffer.from(str).toString("hex"));
  let encoded = "";
  while (num > 0) {
    encoded = String.fromCodePoint(Number(num % 1114111n)) + encoded;
    num /= 1114111n;
  }
  return encoded;
};

export const decodeBase1114111 = (str: string) => {
  let num = 0n;
  for (const char of str) {
    num = num * 1114111n + BigInt(char.codePointAt(0) ?? 0);
  }
  let hex = num.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex").toString();
};

export function htmlImgSrcFromPath(imagePath: string) {
  const rootPath = import.meta.url.split("dist/")[0];
  const absoluteImagePath = new URL(imagePath, rootPath);

  try {
    const base64Image = fsSync.readFileSync(absoluteImagePath, "base64");

    // It needs that prefix -> https://www.geeksforgeeks.org/how-to-display-base64-images-in-html/
    const src = `data:image/png;base64,${base64Image}`;
    return src;
  } catch (err) {
    console.log("Error in common.js @htmlImgSrcFromPath ", err);
    return "";
  }
}

export function dateToTIMESTAMP(date: Date | null | undefined | string) {
  if (!date) {
    return null;
  }
  return new Date(date).toISOString().slice(0, 19).replace("T", " ");
}
