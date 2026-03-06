const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json(
        { status: "ok", version: "0.1.0" },
        { headers: CORS_HEADERS }
      );
    }

    if (url.pathname === "/v1/send" && request.method === "POST") {
      try {
        const body = await request.json() as Record<string, unknown>;

        if (!body.from || !body.to || !body.body) {
          return Response.json(
            { error: "Missing required fields: from, to, body" },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        const message = {
          agentmesh_version: "0.1",
          id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          from: body.from,
          to: body.to,
          timestamp: Math.floor(Date.now() / 1000),
          msg_type: "INTENT",
          body: body.body,
          signature: body.signature || null,
        };

        return Response.json(
          { success: true, message },
          { status: 201, headers: CORS_HEADERS }
        );

      } catch {
        return Response.json(
          { error: "Invalid JSON" },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    if (url.pathname === "/v1/registry" && request.method === "POST") {
      try {
        const body = await request.json() as Record<string, unknown>;

        if (!body.uri || !body.name || !body.capabilities) {
          return Response.json(
            { error: "Missing required fields: uri, name, capabilities" },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        return Response.json(
          { success: true, registered: body.uri },
          { status: 201, headers: CORS_HEADERS }
        );

      } catch {
        return Response.json(
          { error: "Invalid JSON" },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    return Response.json(
      { error: "Not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  },
};
