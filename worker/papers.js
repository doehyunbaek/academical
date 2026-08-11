const ARXIV_ID_PATTERN = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i;
const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i;

export function handlePaperRequest(requestUrl, context, helpers) {
  const id = requestUrl.searchParams.get("id")?.trim() ?? "";
  const doi = requestUrl.searchParams.get("doi")?.trim().toLowerCase() ?? "";

  if (id && doi) {
    return helpers.jsonResponse({ error: "Provide either an arXiv ID or a DOI" }, 400);
  }
  if (id) return proxyArxiv(requestUrl, id, context, helpers);
  if (doi) return proxyDoiMetadata(requestUrl, doi, context, helpers);
  return helpers.jsonResponse({ error: "Missing arXiv ID, DOI, or conference" }, 400);
}

async function proxyArxiv(requestUrl, id, context, helpers) {
  if (!ARXIV_ID_PATTERN.test(id)) {
    return helpers.jsonResponse({ error: "Invalid arXiv ID" }, 400);
  }

  const cacheKey = helpers.makeCacheKey(requestUrl, "id", id);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`, {
      headers: {
        Accept: "application/atom+xml",
        "User-Agent": "Academical/1.0 (https://doehyunbaek.github.io/academical/)",
      },
    });

    if (!upstream.ok) {
      return helpers.jsonResponse({ error: `arXiv returned HTTP ${upstream.status}` }, upstream.status);
    }

    const response = new Response(upstream.body, {
      status: 200,
      headers: helpers.cacheableHeaders("application/atom+xml; charset=utf-8"),
    });
    context.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("Unable to reach arXiv", { id, error: error?.message });
    return helpers.jsonResponse({ error: "Unable to reach arXiv" }, 502);
  }
}

async function proxyDoiMetadata(requestUrl, doi, context, helpers) {
  if (!DOI_PATTERN.test(doi)) {
    return helpers.jsonResponse({ error: "Invalid DOI" }, 400);
  }

  const cacheKey = helpers.makeCacheKey(requestUrl, "doi", doi);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Academical/1.0 (https://doehyunbaek.github.io/academical/; mailto:doehyunbaek@gmail.com)",
      },
    });

    if (!upstream.ok) {
      return helpers.jsonResponse({ error: `Crossref returned HTTP ${upstream.status}` }, upstream.status);
    }

    const payload = await upstream.json();
    const metadata = makeDoiMetadata(payload?.message, doi);
    if (!metadata.title) {
      return helpers.jsonResponse({ error: "Crossref returned invalid DOI metadata" }, 502);
    }

    const response = new Response(JSON.stringify(metadata), {
      status: 200,
      headers: helpers.cacheableHeaders("application/json; charset=utf-8"),
    });
    context.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("Unable to reach Crossref", { doi, error: error?.message });
    return helpers.jsonResponse({ error: "Unable to reach Crossref" }, 502);
  }
}

function makeDoiMetadata(work = {}, requestedDoi) {
  const doi = String(work.DOI || requestedDoi).toLowerCase();
  const isAcm = doi.startsWith("10.1145/");
  const links = Array.isArray(work.link) ? work.link : [];
  const pdfUrl = links.find((link) => link?.URL && link["content-type"] === "application/pdf")?.URL
    || (isAcm ? `https://dl.acm.org/doi/pdf/${doi}` : "");

  return {
    source: isAcm ? "acm" : "doi",
    doi,
    title: cleanText(Array.isArray(work.title) ? work.title[0] : work.title),
    authors: (Array.isArray(work.author) ? work.author : [])
      .map((author) => cleanText([author?.given, author?.family].filter(Boolean).join(" ")))
      .filter(Boolean),
    summary: cleanMarkup(work.abstract),
    published: formatCrossrefDate(work.published || work["published-online"] || work["published-print"]),
    absUrl: isAcm ? `https://dl.acm.org/doi/abs/${doi}` : work.URL || `https://doi.org/${doi}`,
    pdfUrl,
  };
}

function formatCrossrefDate(date = {}) {
  const [year, month = 1, day = 1] = date?.["date-parts"]?.[0] ?? [];
  if (!year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanMarkup(value = "") {
  return cleanText(String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'"));
}

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}
