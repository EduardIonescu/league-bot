import { performance } from "node:perf_hooks";
import puppeteer from "puppeteer";
const start = performance.now();
const browser = await puppeteer.launch({
  headless: true,
  args: [
    "--autoplay-policy=user-gesture-required",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-breakpad",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-domain-reliability",
    "--disable-extensions",
    "--disable-features=AudioServiceOutOfProcess",
    "--disable-hang-monitor",
    "--disable-ipc-flooding-protection",
    "--disable-notifications",
    "--disable-offer-store-unmasked-wallet-cards",
    "--disable-popup-blocking",
    "--disable-print-preview",
    "--disable-prompt-on-repost",
    "--disable-renderer-backgrounding",
    "--disable-setuid-sandbox",
    "--disable-speech-api",
    "--disable-sync",
    "--hide-scrollbars",
    "--ignore-gpu-blacklist",
    "--metrics-recording-only",
    "--mute-audio",
    "--no-default-browser-check",
    "--no-first-run",
    "--no-pings",
    "--no-sandbox",
    "--no-zygote",
    "--password-store=basic",
    "--use-gl=swiftshader",
    "--use-mock-keychain",
  ],
});

export const pageLiveMatch = await browser.newPage();
await pageLiveMatch.setViewport({ width: 1920, height: 780 });
export const pageFinishedMatch = await browser.newPage();
await pageFinishedMatch.setViewport({ width: 920, height: 830 });
const end = performance.now();
console.log(
  "Browser + Page + setViewport: ",
  Math.round((end - start) * 1000) / 1000,
  " ms"
);
