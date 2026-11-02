const ALLOWED_ORIGINS = new Set([
  "https://ashishchaudhary66.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

const MAX_LATEX_BYTES = 30 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // Public, read-only health check for opening the Worker URL directly.
    // Compilation itself remains restricted to the allowlisted app origins.
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        ok: true,
        service: "Resume Lab compiler proxy",
        endpoint: "/compile",
        allowedAppOrigin: "https://ashishchaudhary66.github.io"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response("Origin not allowed.", { status: 403 });
    }

    if (url.pathname !== "/compile") {
      return jsonResponse({ error: "not_found", message: "Use POST /compile." }, 404, origin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed", message: "Use POST /compile." }, 405, origin);
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ error: "request_too_large", message: "Request exceeds the proxy size limit." }, 413, origin);
    }

    let body;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
        return jsonResponse({ error: "request_too_large", message: "Request exceeds the proxy size limit." }, 413, origin);
      }
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "invalid_json", message: "Request body must be valid JSON." }, 400, origin);
    }

    if (typeof body.latex !== "string" || !body.latex.trim()) {
      return jsonResponse({ error: "missing_latex", message: "Provide non-empty LaTeX source in the latex field." }, 400, origin);
    }

    if (new TextEncoder().encode(body.latex).byteLength > MAX_LATEX_BYTES) {
      return jsonResponse({
        error: "latex_source_too_large",
        message: "This proxy is configured for the Pressa anonymous 30 KB source limit."
      }, 413, origin);
    }

    const compiler = body.compiler || "pdflatex";
    if (!["pdflatex", "xelatex"].includes(compiler)) {
      return jsonResponse({ error: "invalid_compiler", message: "Supported compilers are pdflatex and xelatex." }, 400, origin);
    }

    const upstreamHeaders = new Headers({ "Content-Type": "application/json" });
    if (env.PRESSA_API_KEY) {
      upstreamHeaders.set("Authorization", "Bearer " + env.PRESSA_API_KEY);
    }

    try {
      const upstream = await fetch("https://api.pressa.dev/api/v1/compile", {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify({ latex: body.latex, compiler })
      });

      const responseBody = await upstream.text();
      return new Response(responseBody, {
        status: upstream.status,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    } catch {
      return jsonResponse({
        error: "upstream_unavailable",
        message: "The compiler service could not be reached. Try again shortly."
      }, 502, origin);
    }
  }
};
