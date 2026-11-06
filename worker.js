
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        app: "FlowPilot AI",
        version: "2.0",
        status: "online"
      });
    }

    if (url.pathname === "/scenarios") {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }

      // Protect Make.com credentials on the server.
      if (!env.MAKE_API_TOKEN || !env.MAKE_ZONE) {
        return json({ error: "Backend not configured" }, 503);
      }

      // Authentication must be configured before
      // exposing scenario information to the app.
      return json({
        error: "Authentication setup required"
      }, 401);
    }

    return json({ error: "Not found" }, 404);
  }
};
