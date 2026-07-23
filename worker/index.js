import { handlePaperRequest } from "./papers.js";
import { handleResearchrRequest } from "./researchr.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept",
  "Access-Control-Max-Age": "86400",
};

const helpers = {
  makeCacheKey(requestUrl, parameter, value) {
    return new Request(`${requestUrl.origin}${requestUrl.pathname}?${parameter}=${encodeURIComponent(value)}`);
  },

  cacheableHeaders(contentType, maxAge = 3600) {
    return {
      ...corsHeaders,
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${maxAge}`,
    };
  },

  jsonResponse(body, status, extraHeaders = {}) {
    return Response.json(body, {
      status,
      headers: {
        ...corsHeaders,
        ...extraHeaders,
        "Cache-Control": "no-store",
      },
    });
  },
};

export default {
  async fetch(request, env, context) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "GET") {
      return helpers.jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, OPTIONS" });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.searchParams.has("conference")) {
      return handleResearchrRequest(requestUrl, context, helpers);
    }
    return handlePaperRequest(requestUrl, context, helpers);
  },
};
