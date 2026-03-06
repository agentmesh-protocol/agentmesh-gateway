export interface Env {
  AGENT_REGISTRY: KVNamespace;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
      }

      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return json({ status: "ok", version: "0.1.0", kv: !!env.AGENT_REGISTRY });
      }

      if (url.pathname === "/v1/registry" && request.method === "POST") {
        let body: Record<string, unknown>;
        try {
          body = await request.json() as Record<string, unknown>;
        } catch (e) {
          return json({ error: "JSON parse failed", detail: String(e) }, 400);
        }

        if (!body.uri || !body.name || !body.capabilities) {
          return json({ error: "Missing: uri, name, capabilities", got: Object.keys(body) }, 400);
        }

        try {
          const record = {
            uri: body.uri,
            name: body.name,
            capabilities: body.capabilities,
            trust_score: 0.0,
            registered_at: Math.floor(Date.now() / 1000)
          };
          await env.AGENT_REGISTRY.put(
            String(body.uri),
            JSON.stringify(record),
            { expirationTtl: 3600 }
          );
          return json({ success: true, registered: body.uri }, 201);
        } catch (e) {
          return json({ error: "KV write failed", detail: String(e) }, 500);
        }
      }

      if (url.pathname === "/v1/registry" && request.method === "GET") {
        try {
          const capability = url.searchParams.get("capability");
          const list = await env.AGENT_REGISTRY.list();
          const agents = [];
          for (const key of list.keys) {
            const value = await env.AGENT_REGISTRY.get(key.name);
            if (value) {
              const agent = JSON.parse(value);
              if (!capability || (agent.capabilities as string[]).includes(capability)) {
                agents.push(agent);
              }
            }
          }
          return json({ results: agents, total: agents.length });
        } catch (e) {
          return json({ error: "KV read failed", detail: String(e) }, 500);
        }
      }

      if (url.pathname === "/v1/send" && request.method === "POST") {
        let body: Record<string, unknown>;
        try {
          body = await request.json() as Record<string, unknown>;
        } catch (e) {
          return json({ error: "JSON parse failed", detail: String(e) }, 400);
        }

        if (!body.from || !body.to || !body.body) {
          return json({ error: "Missing: from, to, body" }, 400);
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
        return json({ success: true, message }, 201);
      }

      return json({ error: "Not found" }, 404);

    } catch (e) {
      return json({ error: "Unhandled error", detail: String(e) }, 500);
    }
  },
};
