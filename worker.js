
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

const ACCESS_DOMAIN = "royal-brook-a5e0.cloudflareaccess.com";

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function verifyAccessToken(token, env) {
  if (!token || !env.CF_ACCESS_AUD) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const header = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[0]))
    );

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[1]))
    );

    if (header.alg !== "RS256" || !header.kid) return false;

    const issuer = `https://${ACCESS_DOMAIN}`;

    if (payload.iss !== issuer) return false;
    if (!Array.isArray(payload.aud) ||
        !payload.aud.includes(env.CF_ACCESS_AUD)) return false;

    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== "number" ||
        payload.exp <= now ||
        typeof payload.nbf !== "number" ||
        payload.nbf > now) return false;

    const response = await fetch(`${issuer}/cdn-cgi/access/certs`);

    if (!response.ok) return false;

    const certs = await response.json();
    const jwk = certs.keys?.find(
      key => key.kid === header.kid && key.kty === "RSA"
    );

    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["verify"]
    );

    const data = new TextEncoder().encode(
      `${parts[0]}.${parts[1]}`
    );

    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodeBase64Url(parts[2]),
      data
    );
  } catch {
    return false;
  }
}

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

      if (!env.MAKE_API_TOKEN || !env.MAKE_ZONE) {
        return json({ error: "Backend not configured" }, 500);
      }

      const token = request.headers.get(
        "Cf-Access-Jwt-Assertion"
      );

      const authorized = await verifyAccessToken(token, env);

      if (!authorized) {
        return json({ error: "Login required" }, 401);
      }

          const makeUrl =
        "https://us2.make.com/api/v2/scenarios?organizationId=3356075";

      try {
        const response = await fetch(makeUrl, {
          method: "GET",
          headers: {
            Authorization: "Token " + env.MAKE_API_TOKEN,
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          return json({
            error: "Make.com request failed",
            status: response.status
          }, 502);
        }

        const data = await response.json();
        return json({
          scenarios: data.scenarios || []
        });
      } catch (error) {
        return json({
          error: "Unable to reach Make.com"
        }, 502);
      }    }

    return json({ error: "Not found" }, 404);
  }
};
