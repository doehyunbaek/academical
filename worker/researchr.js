const DEADLINE_CONFERENCES = new Set(["ICSE", "FSE", "ASE", "ISSTA", "OOPSLA"]);
const RESEARCHR_MONTHS = new Map([
  ["Jan", 1], ["Feb", 2], ["Mar", 3], ["Apr", 4], ["May", 5], ["Jun", 6],
  ["Jul", 7], ["Aug", 8], ["Sep", 9], ["Oct", 10], ["Nov", 11], ["Dec", 12],
]);

export function handleResearchrRequest(requestUrl, context, helpers) {
  const conference = requestUrl.searchParams.get("conference")?.trim().toUpperCase() ?? "";
  const year = Number(requestUrl.searchParams.get("year"));
  return proxyResearchrDeadlines(requestUrl, conference, year, context, helpers);
}

async function proxyResearchrDeadlines(requestUrl, conference, year, context, helpers) {
  if (!DEADLINE_CONFERENCES.has(conference) || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return helpers.jsonResponse({ error: "Invalid conference or year" }, 400);
  }

  const cacheKey = helpers.makeCacheKey(requestUrl, "conference", `${conference}-${year}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const slug = conference === "OOPSLA" ? `splash-${year}` : `${conference.toLowerCase()}-${year}`;
  const sourceUrl = `https://conf.researchr.org/dates/${slug}`;
  try {
    const upstream = await fetch(sourceUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Academical/1.0 (https://doehyunbaek.github.io/academical/)",
      },
    });

    if (upstream.status === 404) {
      return cacheDeadlineResponse(cacheKey, {
        conference, year, available: false, sourceUrl, deadlines: [],
      }, context, helpers, 21_600);
    }
    if (!upstream.ok) {
      return helpers.jsonResponse({ error: `Researchr returned HTTP ${upstream.status}` }, 502);
    }

    const html = await upstream.text();
    const deadlines = parseResearchrDeadlines(html, conference);
    return cacheDeadlineResponse(cacheKey, {
      conference,
      year,
      available: deadlines.length > 0,
      sourceUrl,
      deadlines,
      checkedAt: new Date().toISOString(),
    }, context, helpers, deadlines.length ? 3_600 : 21_600);
  } catch (error) {
    console.error("Unable to reach Researchr", { conference, year, error: error?.message });
    return helpers.jsonResponse({ error: "Unable to reach Researchr" }, 502);
  }
}

export function parseResearchrDeadlines(html, conference) {
  const rows = String(html).match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  return rows.flatMap((row) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => cleanMarkup(match[1]));
    if (cells.length !== 3) return [];
    const [when, track, label] = cells;
    if (!isMainConferenceTrack(conference, track) || !isPrimarySubmissionLabel(label)) return [];
    const date = parseResearchrDate(when);
    if (!date) return [];
    const link = decodeHtml(row.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? "");
    return [{ date: `${date} 23:59`, track, label, link }];
  }).filter((deadline, index, all) => all.findIndex((item) => item.date === deadline.date) === index)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function isMainConferenceTrack(conference, track) {
  const normalized = track.toLowerCase();
  if (conference === "OOPSLA") return /^oopsla(?:\s+\d{4})?$/.test(normalized);
  if (conference === "ICSE") return /^(research track|technical track|technical papers)$/.test(normalized);
  if (conference === "ISSTA") return /^(research papers|technical papers|issta technical papers)$/.test(normalized);
  return /^(research papers|research track|technical papers|technical track)$/.test(normalized);
}

function isPrimarySubmissionLabel(label) {
  const normalized = label.toLowerCase();
  if (!/(submission|submissions|papers? due)/.test(normalized)) return false;
  return !/(abstract|revision|revised|camera|artifact|response|notification|registration)/.test(normalized);
}

function parseResearchrDate(value) {
  const match = value.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})/);
  if (!match) return "";
  const month = RESEARCHR_MONTHS.get(match[2]);
  if (!month) return "";
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function cleanMarkup(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cacheDeadlineResponse(cacheKey, payload, context, helpers, maxAge) {
  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: helpers.cacheableHeaders("application/json; charset=utf-8", maxAge),
  });
  context.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}
