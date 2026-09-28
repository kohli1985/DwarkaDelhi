// Shared helpers for the first-party analytics described in Part B — a
// lightweight anonymous session id (no login, no PII) used only to dedupe
// a rapid double-fire of the same event, and a coarse bot filter so an
// obvious crawler/monitor doesn't inflate view/click counts. Deliberately
// simple: this is "good enough to keep the numbers honest", not a full
// bot-detection or session-analytics system.
export const SESSION_COOKIE = "dd_sid";

// Common crawler/monitoring substrings in the User-Agent header. Not
// exhaustive — the goal is filtering out the obvious, high-volume cases
// (search engine crawlers, uptime monitors, link-preview bots, headless
// scripts), not building a robust bot-detection system.
const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptimerobot|curl|wget|python-requests|go-http-client/i;

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // no UA at all is itself a strong bot signal
  return BOT_UA_PATTERN.test(userAgent);
}
