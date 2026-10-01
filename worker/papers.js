const ARXIV_ID_PATTERN = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i;
const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i;
const USENIX_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

export function handlePaperRequest(requestUrl, context, helpers) {
  const id = requestUrl.searchParams.get("id")?.trim() ?? "";
  const doi = requestUrl.searchParams.get("doi")?.trim().toLowerCase() ?? "";
  const usenix = requestUrl.searchParams.get("usenix")?.trim().toLowerCase() ?? "";
  const legacy = requestUrl.searchParams.get("legacy");

  if (legacy !== null && (legacy !== "1" || !usenix)) {
    return helpers.jsonResponse({ error: "Invalid USENIX paper format" }, 400);
  }
  if ([id, doi, usenix].filter(Boolean).length > 1) {
    return helpers.jsonResponse({ error: "Provide one paper identifier" }, 400);
  }
  if (id) return proxyArxiv(requestUrl, id, context, helpers);
  if (doi) return proxyDoiMetadata(requestUrl, doi, context, helpers);
  if (usenix) return proxyUsenixMetadata(requestUrl, usenix, context, helpers);
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

async function proxyUsenixMetadata(requestUrl, usenixId, context, helpers) {
  if (!USENIX_ID_PATTERN.test(usenixId) || !usenixId.includes("-")) {
    return helpers.jsonResponse({ error: "Invalid USENIX paper identifier" }, 400);
  }

  const legacy = requestUrl.searchParams.get("legacy") === "1";
  const cacheKey = helpers.makeCacheKey(requestUrl, "usenix", `${legacy ? "legacy:" : ""}${usenixId}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const [conference, ...slugParts] = usenixId.split("-");
  const slug = slugParts.join("-");
  const absUrl = legacy
    ? `https://www.usenix.org/conference/${conference}/technical-sessions/presentation/${slug}`
    : `https://www.usenix.org/conference/${conference}/presentation/${slug}`;
  try {
    const upstream = await fetch(absUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Academical/1.0 (https://doehyunbaek.github.io/academical/; mailto:doehyunbaek@gmail.com)",
      },
    });
    if (!upstream.ok) return helpers.jsonResponse({ error: `USENIX returned HTTP ${upstream.status}` }, upstream.status);

    const metadata = parseUsenixHtml(await upstream.text(), usenixId, absUrl);
    if (metadata && legacy) metadata.pdfUrl = `https://www.usenix.org/system/files/conference/${conference}/${conference}-paper-${slug}.pdf`;
    if (!metadata?.title) return helpers.jsonResponse({ error: "USENIX returned invalid metadata" }, 502);

    const response = new Response(JSON.stringify(metadata), {
      status: 200,
      headers: helpers.cacheableHeaders("application/json; charset=utf-8"),
    });
    context.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("Unable to reach USENIX", { usenixId, error: error?.message });
    return helpers.jsonResponse({ error: "Unable to reach USENIX" }, 502);
  }
}

function parseUsenixHtml(html, usenixId, absUrl) {
  const metaValues = (name) => [...html.matchAll(/<meta\s+[^>]*>/gi)]
    .filter(([tag]) => new RegExp(`name=["']${name}["']`, "i").test(tag))
    .map(([tag]) => decodeHtmlAttribute(tag.match(/content=["']([^"']*)["']/i)?.[1] || ""))
    .filter(Boolean);
  const title = metaValues("citation_title")[0] || "";
  if (!title) return null;

  return {
    source: "usenix",
    publisherId: usenixId,
    title,
    authors: metaValues("citation_author"),
    summary: "",
    published: normalizeCitationDate(metaValues("citation_publication_date")[0] || ""),
    absUrl,
    pdfUrl: metaValues("citation_pdf_url")[0] || `https://www.usenix.org/system/files/${usenixId}.pdf`,
  };
}

async function proxyDoiMetadata(requestUrl, doi, context, helpers) {
  if (!DOI_PATTERN.test(doi)) {
    return helpers.jsonResponse({ error: "Invalid DOI" }, 400);
  }

  const cacheValue = doi.startsWith("10.5555/") ? `usenix-v3:${doi}` : doi;
  const cacheKey = helpers.makeCacheKey(requestUrl, "doi", cacheValue);
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
      if (doi.startsWith("10.5555/") && upstream.status === 404) {
        const metadata = await fetchAcmDlMetadata(doi);
        if (metadata?.title) {
          const response = new Response(JSON.stringify(metadata), {
            status: 200,
            headers: helpers.cacheableHeaders("application/json; charset=utf-8"),
          });
          context.waitUntil(caches.default.put(cacheKey, response.clone()));
          return response;
        }
      }
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
  const isUsenix = doi.startsWith("10.5555/");
  const isAcmDl = isAcm || isUsenix;
  const links = Array.isArray(work.link) ? work.link : [];
  const pdfUrl = links.find((link) => link?.URL && link["content-type"] === "application/pdf")?.URL
    || (isAcmDl ? `https://dl.acm.org/doi/pdf/${doi}` : "");

  return {
    source: isAcm ? "acm" : isUsenix ? "usenix" : "doi",
    doi,
    title: cleanText(Array.isArray(work.title) ? work.title[0] : work.title),
    authors: (Array.isArray(work.author) ? work.author : [])
      .map((author) => cleanText([author?.given, author?.family].filter(Boolean).join(" ")))
      .filter(Boolean),
    summary: cleanMarkup(work.abstract),
    published: formatCrossrefDate(work.published || work["published-online"] || work["published-print"]),
    absUrl: isAcmDl ? `https://dl.acm.org/doi/abs/${doi}` : work.URL || `https://doi.org/${doi}`,
    pdfUrl,
  };
}

async function fetchAcmDlMetadata(doi) {
  const articleUrl = `https://dl.acm.org/doi/${doi}`;
  const upstream = await fetch(articleUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent": "Academical/1.0 (https://doehyunbaek.github.io/academical/; mailto:doehyunbaek@gmail.com)",
    },
  });

  if (upstream.ok) {
    const html = await upstream.text();
    const metadata = parseAcmDlHtml(html, doi);
    if (metadata) return metadata;
  }

  // ACM's bot protection can block server-side requests. Wikimedia's citation
  // service translates the public ACM page into structured Zotero metadata.
  const citation = await fetch(
    `https://en.wikipedia.org/api/rest_v1/data/citation/mediawiki/${encodeURIComponent(articleUrl)}`,
    { headers: { Accept: "application/json" } },
  );
  if (citation.ok) {
    const metadata = parseWikimediaCitation(await citation.json(), doi);
    if (metadata) return metadata;
  }

  // Keep a text-only reader as a secondary fallback in case citation translation fails.
  const reader = await fetch(`https://r.jina.ai/${articleUrl}`, {
    headers: { Accept: "text/plain" },
  });
  if (!reader.ok) {
    console.warn("Unable to load ACM DL metadata", { doi, acmStatus: upstream.status, readerStatus: reader.status });
    return makeUsenixMetadata({ doi, title: `USENIX:${doi}` });
  }
  return parseAcmDlMarkdown(await reader.text(), doi)
    || makeUsenixMetadata({ doi, title: `USENIX:${doi}` });
}

function parseWikimediaCitation(payload, doi) {
  const item = Array.isArray(payload) ? payload[0] : null;
  const title = cleanText(item?.title || "");
  if (!title) return null;

  const authors = (Array.isArray(item.author) ? item.author : [])
    .map((author) => Array.isArray(author)
      ? cleanText([author[0], author[1]].filter(Boolean).join(" "))
      : cleanText([author?.firstName, author?.lastName, author?.name].filter(Boolean).join(" ")))
    .filter(Boolean);

  return makeUsenixMetadata({
    doi,
    title,
    authors,
    summary: cleanText(item.abstractNote || ""),
    published: normalizeCitationDate(item.date || ""),
  });
}

function parseAcmDlHtml(html, doi) {
  const metaValues = (name) => [...html.matchAll(/<meta\s+[^>]*>/gi)]
    .filter(([tag]) => new RegExp(`(?:name|property)=["']${name}["']`, "i").test(tag))
    .map(([tag]) => decodeHtmlAttribute(tag.match(/content=["']([^"']*)["']/i)?.[1] || ""))
    .filter(Boolean);
  const title = metaValues("citation_title")[0] || metaValues("og:title")[0] || "";
  if (!title) return null;

  return makeUsenixMetadata({
    doi,
    title,
    authors: metaValues("citation_author"),
    summary: metaValues("description")[0] || metaValues("og:description")[0] || "",
    published: normalizeCitationDate(metaValues("citation_publication_date")[0] || ""),
    pdfUrl: metaValues("citation_pdf_url")[0],
  });
}

function parseAcmDlMarkdown(markdown, doi) {
  const article = markdown.match(/\n# ([^\n]+)\n\nAUTHORs:([\s\S]*?)\n\[Authors Info & Claims\]/i);
  const title = cleanText(article?.[1] || markdown.match(/^Title:\s*([^|\n]+)/im)?.[1] || "");
  if (!title) return null;

  const authors = [...(article?.[2] || "").matchAll(new RegExp(
    `https://dl\\.acm\\.org/doi/${escapeRegExp(doi)}#\\s+["']([^"']+)["']`,
    "gi",
  ))].map((match) => cleanText(match[1])).filter(Boolean);
  const published = markdown.match(/Published:\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1] || "";
  const summary = cleanText(markdown.match(/## Abstract\s+([\s\S]*?)(?:\n## |$)/i)?.[1] || "");

  return makeUsenixMetadata({
    doi,
    title,
    authors: [...new Set(authors)],
    summary,
    published: normalizeCitationDate(published),
  });
}

function makeUsenixMetadata({ doi, title, authors = [], summary = "", published = "", pdfUrl = "" }) {
  return {
    source: "usenix",
    doi,
    title,
    authors,
    summary,
    published,
    absUrl: `https://dl.acm.org/doi/abs/${doi}`,
    pdfUrl: pdfUrl || `https://dl.acm.org/doi/pdf/${doi}`,
  };
}

function normalizeCitationDate(value) {
  const text = String(value).trim();
  const numericParts = text.split(/[-/]/);
  if (/^\d{4}$/.test(numericParts[0])) {
    const [year, month = "01", day = "01"] = numericParts;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const textual = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!textual) return "";
  const month = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
    .indexOf(textual[2].toLowerCase()) + 1;
  return month ? `${textual[3]}-${String(month).padStart(2, "0")}-${textual[1].padStart(2, "0")}` : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlAttribute(value) {
  return cleanText(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'");
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
