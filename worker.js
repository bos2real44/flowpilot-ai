// FlowPilot AI 2.0 — Cloudflare Worker
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});
const ACCESS_TEAM_DOMAIN = "royal-brook-a5e0.cloudflareaccess.com";
const encoder = new TextEncoder();
function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(bytes, c => c.charCodeAt(0));
}
function decodeJsonPart(part) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(part)));
}
async function verifyAccessToken(token, env) {
  if (!token || !env.CF_ACCESS_AUD) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = decodeJsonPart(parts[0]);
    const payload = decodeJsonPart(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    const issuer = `https://${ACCESS_TEAM_DOMAIN}`;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return false;
    if (payload.iss !== issuer || !Array.isArray(payload.aud) && typeof payload.aud !== "string") return false;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(env.CF_ACCESS_AUD)) return false;
    if (typeof payload.exp !== "number" || payload.exp <= now) return false;
    if (typeof payload.nbf === "number" && payload.nbf > now) return false;
    const response = await fetch(`${issuer}/cdn-cgi/access/certs`, { headers: { Accept: "application/json" } });
    if (!response.ok) return false;
    const jwks = await response.json();
    const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === "RSA");
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodeBase64Url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  } catch { return false; }
}
async function listScenarios(env) {
  if (!env.MAKE_API_TOKEN || !env.MAKE_ZONE) {
    return json({ error: "Make.com not configured", missing: [
      ...(!env.MAKE_API_TOKEN ? ["MAKE_API_TOKEN"] : []),
      ...(!env.MAKE_ZONE ? ["MAKE_ZONE"] : [])
    ] }, 503);
  }
  const zone = String(env.MAKE_REGION || "us2");
  if (!/^(us1|us2|eu1|eu2)$/.test(zone)) return json({ error: "Invalid MAKE_REGION" }, 500);
  const url = new URL(`https://${zone}.make.com/api/v2/scenarios`);
  url.searchParams.set("organizationId", String(env.MAKE_ZONE));
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Token ${env.MAKE_API_TOKEN}`, Accept: "application/json" }
    });
    if (!response.ok) return json({ error: "Make.com request failed", upstreamStatus: response.status }, 502);
    const data = await response.json();
    return json({ scenarios: Array.isArray(data.scenarios) ? data.scenarios : [], pagination: data.pgw || null });
  } catch { return json({ error: "Unable to reach Make.com" }, 502); }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (path === "/" || path === "/health") {
      return json({ app: "FlowPilot AI", version: "2.0", status: "online" });
    }
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!(await verifyAccessToken(token, env))) return json({ error: "Login required" }, 401);
    if (path === "/api/status") {
      return json({
        app: "FlowPilot AI", version: "2.0", status: "online",
        connections: { make: Boolean(env.MAKE_API_TOKEN && env.MAKE_ZONE) },
        execution: "read-only",
        approvals: "required for future sensitive actions"
      });
    }
    if (path === "/scenarios" || path === "/api/scenarios") return listScenarios(env);
    return json({ error: "Not found" }, 404);
  }
};
