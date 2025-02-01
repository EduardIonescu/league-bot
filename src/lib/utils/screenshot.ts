import { AttachmentBuilder } from "discord.js";
import { Browser } from "puppeteer";
import { HTMLString } from "../types/common";

type Viewport = { width: number; height: number };
export async function screenshot(
  browser: Browser,
  html: HTMLString,
  viewport: Viewport
) {
  const page = await browser.newPage();
  page.setViewport(viewport);
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  const screenshot = await page.screenshot({
    fullPage: true,
    optimizeForSpeed: true,
  });
  const screenshotBuffer = Buffer.from(screenshot);
  const image = new AttachmentBuilder(screenshotBuffer, { name: "live.png" });

  page.close();

  return image;
}
