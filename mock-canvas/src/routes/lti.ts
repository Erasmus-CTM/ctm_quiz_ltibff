import { Router } from "express";
import { users, courses, assignments } from "../data/seed";
import jwt from "jsonwebtoken";
import { pem2jwk } from "pem-jwk";

const router = Router();

// The mock uses a hardcoded symmetric secret.
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0ouKsVLR1k+Bhl/5jWOTfIL363iAs6urbf02hDmj57xJYjP5
cR+SiR8tfxpPUjeN0qkRF0X9t3x81Gy2oKBB3xnopPdWzAg0cv6l+K+43cOJoTiM
OpbRNwPDsTqMXqin6RmaOjbvdMRvCqVISu+HGTfAGH/wQMz89yM0UK9ohN3aRQVx
tsFuHfbRE2utkxW+wgq8yP+9c2BRC9Fj5dBOlcmGmB6teGmqyhRztpX/YkMcTkJ5
Ep0MZIr3WwlOGuKamcu9aIJYWA1SNc+Lixt3GrAuQw8RSSq0eXCMxV8yaJRYWXDD
UQv7GGpu8ny0eshvNoE1394iHxv6CJSg0KOTFQIDAQABAoIBACBvYdWRJNrHUx9l
4AEsSBd5lQLqr1JpOGwl2EUEx4osLgFEcNbrXmePF4hfVRKdP1Um5DH51NfJrvC0
shUgYHV5EtIoeRp5NcdKETyJ/vNJq9qxO50iXdGusUeMyvzMLliRL/rBkCB6IIHQ
gPNrtMbURAd3h4YcGOkOZyv6PHeh7sLZywpEdSiN2cyxIbJPg0TCiepbpDE1sg+v
OVZJHA9f7wptS5IBpKfCCaEIbFla7f+mU0rrLJez2J/fGj/Lj7H1kuMJYgNO1jer
nqnL1X6Wg4GKKmwK3c8K4jK58AvYuwWt6lmMlAkc98rr48V1WIVE+kAmdamPsUNu
uEv1LJMCgYEA+hk18otxubuokscisexgMnXukuQuUJyuFC5zjR8RGqEVI6kCmeH7
tI95PPVBfBvLYzL4+6gDIM8Qg/nlJsZPuHPh/MKWJLtDEvatmp6OExrEQWpl81A7
a++6o3B82Yxro/Mjbq77cLSjuFjk326mi8d8hN29LGTUEic7uPl7uW8CgYEA14Nl
1Ps5M/JBrLTBE6tPa3zr2OaBzSL8wKxc3uPcgG4x0StScLASZp9jTnHLhDb/YMSY
N8/R1I4gaCu1xV+owe69Xten+bLJPIQz4W3oJUdr6HMtO2oAz/0VrgZkB0txw2mp
0QKY6qH1OAdwlrNQs10p1V66dDMNPYR8KWpZUbsCgYBSkeI6uokIfglQtEgjH9w+
rKrgek9ENAZRCWkC7X/TH91/0XvXXEGiwj+PvZUqKW8DyD9lrnmh6lsUh3t9Srnl
NvUkYwX5CI5Dg4ebZb+YVRz4T+1q4FFN+G7RKQE/PdoH3e0TzNecxTbMVSTzE3AO
9ASLRT4AmyVc/PD9x/huJwKBgQCWxwRIpNbZhAT0qqVmeHUhE44B+wsXFQJWXoC/
JBYR+IZ7+946nsTQ7XRR3oVvY/b5obGJYqlAF4uOtf3/L7TmsXvlzeVkafQmlaui
bP18j2Jsh6A+sCQPX9Z6IVh8TgkymUtIwpNvnI3ufC4GEUBFrMlm0VaLk2gRAQ7I
/vGsnwKBgQCwTf8ovvBiCuJCTyzU3Qzxud2rIyiYccXRbYhktbjpP1P4hd4APZZp
feO7op9EJzvXAQ6tLAIICt4hAhAKDf2vdOqRgChhEaqubuXsnLjUnFcM1NJUkKTV
pMRdh+CWgCIJYmXEHeXFM6EwWGVyiDo8WoMSEe5W+Q9zBAR7dklDCQ==
-----END RSA PRIVATE KEY-----
`;

const PUBLIC_KEY = `-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEA0ouKsVLR1k+Bhl/5jWOTfIL363iAs6urbf02hDmj57xJYjP5cR+S
iR8tfxpPUjeN0qkRF0X9t3x81Gy2oKBB3xnopPdWzAg0cv6l+K+43cOJoTiMOpbR
NwPDsTqMXqin6RmaOjbvdMRvCqVISu+HGTfAGH/wQMz89yM0UK9ohN3aRQVxtsFu
HfbRE2utkxW+wgq8yP+9c2BRC9Fj5dBOlcmGmB6teGmqyhRztpX/YkMcTkJ5Ep0M
ZIr3WwlOGuKamcu9aIJYWA1SNc+Lixt3GrAuQw8RSSq0eXCMxV8yaJRYWXDDUQv7
GGpu8ny0eshvNoE1394iHxv6CJSg0KOTFQIDAQAB
-----END RSA PUBLIC KEY-----`;

const CLIENT_ID = "mock-client-id-12345";
const JWT_KEY_ID = "mock-key-1"
/**
 * Step 1 – OIDC Login Initiation
 * Canvas POSTs here first. We redirect straight back to the BFF's redirect_uri.
 *
 * Real Canvas: POST /api/lti/authorize_redirect
 * Mock:        POST /lti/authorize
 */
router.post("/authorize", (req, res) => {
    const { redirect_uri, state, nonce, login_hint } = req.body;

    if (!redirect_uri) {
        return res.status(400).json({ error: "redirect_uri is required" });
    }

    // Pick a user based on login_hint (user id), default to first student
    const PORT = process.env.PORT ?? 3001;
    const userId = Number(login_hint ?? 1);
    const user = users.find((u) => u.id === userId) ?? users[0];
    // Build a minimal LTI 1.3 id_token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: `http://localhost:${PORT}`,
        sub: String(user.id),
        aud: CLIENT_ID,
        iat: now,
        exp: now + 300,
        nonce,
        // LTI claims
        "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
        "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "mock-deployment-1",
        "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": redirect_uri,
        "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
            id: "mock-resource-link-1",
            title: "Mock Quiz",
        },
        "https://purl.imsglobal.org/spec/lti/claim/context": {
            id: String(courses[0].id),
            label: courses[0].course_code,
            title: courses[0].name,
        },
        "https://purl.imsglobal.org/spec/lti/claim/roles": [
            user.role === "teacher"
                ? "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
                : "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
        ],
        // Names & Roles + Assignment & Grade Services endpoints
        "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
            scope: [
                "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
                "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
                "https://purl.imsglobal.org/spec/lti-ags/scope/score",
            ],
            lineitems: `http://localhost:${PORT}/api/v1/courses/${courses[0].id}/assignments`,
        },
        given_name: user.name.split(" ")[0],
        family_name: user.name.split(" ").slice(1).join(" "),
        email: user.email,
    };

    const idToken = jwt.sign(payload, PRIVATE_KEY, { algorithm: "RS256", keyid: JWT_KEY_ID });
    const decoded = jwt.decode(idToken, { complete: true })

    console.log(`JWT header: ${JSON.stringify(decoded!.header)}`)
    console.log(`JWT payload: ${JSON.stringify(payload, undefined, 2)}`)

    // LTI 1.3 requires the id_token to be delivered via a form POST (not a GET redirect).
    // We return a self-submitting HTML page — the browser POSTs to the BFF just like Canvas would.
    res.send(`<!DOCTYPE html>
<html>
  <body>
    <form id="lti_launch" method="POST" action="${redirect_uri}">
      <input type="hidden" name="id_token" value="${idToken}" />
      ${state ? `<input type="hidden" name="state" value="${state}" />` : ''}
    </form>
    <script>document.getElementById('lti_launch').submit();</script>
  </body>
</html>`);
});

/**
 * JWKS endpoint — BFF fetches this to verify id_token signatures.
 * For HS256 (symmetric) this is a no-op in real life, but we expose it
 * so the BFF URL config works the same way as with real Canvas (RS256 + JWKS).
 *
 * Swap to RS256 + real JWK if you want to fully mirror Canvas behaviour.
 */
router.get("/jwks", (_req, res) => {
    const jwk = pem2jwk(PUBLIC_KEY);
    res.json({
        keys: [
            {
                kty: "RSA",
                alg: "RS256",
                k: Buffer.from(PRIVATE_KEY).toString("base64url"),
                use: "sig",
                kid: "mock-key-1",
            },
        ],
    });
});

/**
 * Convenience: simulate a Canvas LTI launch by just hitting this URL in a browser.
 * It POSTs to /lti/authorize and redirects the browser through the full flow.
 *
 * Usage: GET http://localhost:3001/lti/launch-as?user_id=1&redirect_uri=http://localhost:3000/lti/callback
 */
router.get("/launch-as", (req, res) => {
    const { user_id = "1", redirect_uri } = req.query as Record<string, string>;

    if (!redirect_uri) {
        return res.status(400).send("Pass ?redirect_uri=http://your-bff/lti/callback");
    }

    // Self-POST
    res.send(`
    <html><body>
      <form id="f" method="POST" action="/lti/authorize">
        <input name="redirect_uri" value="${redirect_uri}">
        <input name="login_hint"   value="${user_id}">
        <input name="state"        value="mock-state-${Date.now()}">
        <input name="nonce"        value="mock-nonce-${Date.now()}">
      </form>
      <script>document.getElementById('f').submit()</script>
    </body></html>
  `);
});

export default router;