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
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(JSON.stringify({
        ok: true,
        service: "Resume Lab compiler proxy",
        endpoint: "/compile",
        pdfEndpoint: "/pdf",
        allowedAppOrigin: "https://ashishchaudhary66.github.io"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    // Pressa's signed PDF endpoint may disallow iframe embedding. Fetch it
    // server-to-server and return it from this Worker without upstream frame headers.
    if (url.pathname === "/pdf" && request.method === "GET") {
      const signedSource = url.searchParams.get("source");
      let pdfUrl;

      try {
        pdfUrl = new URL(signedSource || "");
      } catch {
        return new Response("A valid signed PDF source URL is required.", { status: 400 });
      }

      const validPdfUrl =
        pdfUrl.protocol === "https:" &&
        pdfUrl.hostname === "api.pressa.dev" &&
        /^\\/api\\/v1\\/pdfs\\/[a-zA-Z0-9_-]+$/.test(pdfUrl.pathname) &&
        pdfUrl.searchParams.has("sig") &&
        pdfUrl.searchParams.has("exp");

      if (!validPdfUrl) {
        return new Response("The PDF source URL is not an approved Pressa signed PDF URL.", { status: 400 });
      }

      try {
        const upstreamPdf = await fetch(pdfUrl.toString(), { method: "GET" });
        if (!upstreamPdf.ok) {
          const message = await upstreamPdf.text();
          return new Response(message || "Pressa could not return the compiled PDF.", {
            status: upstreamPdf.status,
            headers: { "Content-Type": upstreamPdf.headers.get("Content-Type") || "text/plain; charset=utf-8" }
          });
        }

        return new Response(upstreamPdf.body, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="resume.pdf"',
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "frame-ancestors https://ashishchaudhary66.github.io http://localhost:5173 http://127.0.0.1:5173"
          }
        });
      } catch {
        return new Response("Could not retrieve the compiled PDF from Pressa.", { status: 502 });
      }
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
      let responseText = responseBody;
      const contentType = upstream.headers.get("Content-Type") || "application/json; charset=utf-8";

      if (upstream.ok && contentType.includes("application/json")) {
        try {
          const result = JSON.parse(responseBody);
          if (typeof result.pdf_url === "string") {
            const signedPdfUrl = new URL(result.pdf_url);
            const validPdfUrl =
              signedPdfUrl.protocol === "https:" &&
              signedPdfUrl.hostname === "api.pressa.dev" &&
              /^\\/api\\/v1\\/pdfs\\/[a-zA-Z0-9_-]+$/.test(signedPdfUrl.pathname) &&
              signedPdfUrl.searchParams.has("sig") &&
              signedPdfUrl.searchParams.has("exp");

            if (!validPdfUrl) {
              return jsonResponse({
                error: "invalid_pdf_url",
                message: "Pressa returned a PDF URL outside the approved signed PDF endpoint."
              }, 502, origin);
            }

            result.pdf_url = url.origin + "/pdf?source=" + encodeURIComponent(signedPdfUrl.toString());
            responseText = JSON.stringify(result);
          }
        } catch (error) {
          if (error instanceof TypeError) throw error;
          // Preserve the original compiler response if it is not the expected JSON shape.
        }
      }

      return new Response(responseText, {
        status: upstream.status,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": contentType,
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
