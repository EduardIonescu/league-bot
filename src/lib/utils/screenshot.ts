import { AttachmentBuilder } from "discord.js";
import { HTMLString } from "../types/common";
import { page } from "./browser.js";

type Viewport = { width: number; height: number };
export async function screenshot(
  html: HTMLString,
  viewport: Viewport,
  live: boolean = true
) {
  if (viewport && viewport.width !== page.viewport()?.width) {
    page.setViewport(viewport);
  }
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  const screenshot = await page.screenshot({
    optimizeForSpeed: true,
    type: "webp",
    omitBackground: true,
  });

  const screenshotBuffer = Buffer.from(screenshot);

  const name = live ? "live.webp" : "finsished.webp";
  const image = new AttachmentBuilder(screenshotBuffer, { name });

  return image;
}
