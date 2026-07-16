const ARXIV_ID_PATTERN = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, context) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, OPTIONS" });
    }

    const requestUrl = new URL(request.url);
    const id = requestUrl.searchParams.get("id")?.trim() ?? "";
    if (!ARXIV_ID_PATTERN.test(id)) {
      return jsonResponse({ error: "Invalid arXiv ID" }, 400);
    }

    const cacheKey = new Request(`${requestUrl.origin}${requestUrl.pathname}?id=${encodeURIComponent(id)}`);
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;

    try {
      const upstream = await fetch(
        `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`,
        {
          headers: {
            Accept: "application/atom+xml",
            "User-Agent": "Academical/1.0 (https://doehyunbaek.github.io/academical/)",
          },
        },
      );

      if (!upstream.ok) {
        return jsonResponse({ error: `arXiv returned HTTP ${upstream.status}` }, upstream.status);
      }

      const response = new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/atom+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
      context.waitUntil(caches.default.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      console.error("Unable to reach arXiv", { id, error: error?.message });
      return jsonResponse({ error: "Unable to reach arXiv" }, 502);
    }
  },
};

function jsonResponse(body, status, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Cache-Control": "no-store",
    },
  });
}
