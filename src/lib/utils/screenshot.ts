import { AttachmentBuilder } from "discord.js";
import { performance } from "node:perf_hooks";
import { HTMLString } from "../types/common";
import { page } from "./browser.js";

type Viewport = { width: number; height: number };
export async function screenshot(
  html: HTMLString,
  viewport: Viewport,
  live: boolean = true
) {
  const beforePage = performance.now();
  if (viewport && viewport.width !== page.viewport()?.width) {
    page.setViewport(viewport);
  }
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  const afterSetcontent = performance.now();

  const screenshot = await page.screenshot({
    optimizeForSpeed: true,
    type: "webp",
    omitBackground: true,
  });
  const afterScreenshot = performance.now();

  const screenshotBuffer = Buffer.from(screenshot);

  const afterBuffer = performance.now();

  const name = live ? "live.webp" : "finsished.webp";
  const image = new AttachmentBuilder(screenshotBuffer, { name });
  const afterImage = performance.now();

  const afterPageClose = performance.now();

  console.log(
    "afterSetcontent - beforePage",
    Math.round((afterSetcontent - beforePage) * 1000) / 1000 + " ms"
  );
  console.log(
    "afterScreenshot - afterSetcontent",
    Math.round((afterScreenshot - afterSetcontent) * 1000) / 1000 + " ms"
  );
  console.log(
    "afterBuffer - afterScreenshot",
    Math.round((afterBuffer - afterScreenshot) * 1000) / 1000 + " ms"
  );
  console.log(
    "afterImage - afterBuffer",
    Math.round((afterImage - afterBuffer) * 1000) / 1000 + " ms"
  );
  console.log(
    "afterPageClose - afterImage",
    Math.round((afterPageClose - afterImage) * 1000) / 1000 + " ms"
  );

  return image;
}
