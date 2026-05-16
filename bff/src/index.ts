import "dotenv/config";
import { createLtiApp } from "./app";

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  const Lti = await createLtiApp();

  console.log("Deploying LTI...");
  await Lti.deploy({ port: PORT });

  console.log("Registering platform...");

  await Lti.registerPlatform({
    url: process.env.CANVAS_BASE_URL ?? "http://localhost:3001",
    name: process.env.CANVAS_PLATFORM_NAME ?? "Mock Canvas",
    clientId: process.env.CANVAS_CLIENT_ID ?? "mock-client-id-12345",

    authenticationEndpoint:
      process.env.CANVAS_AUTH_ENDPOINT ?? "http://localhost:3001/lti/authorize",

    accesstokenEndpoint:
      process.env.CANVAS_TOKEN_ENDPOINT ?? "http://localhost:3001/lti/token",

    authConfig: {
      method: "JWK_SET",
      key: process.env.CANVAS_JWKS_URL ?? "http://localhost:3001/lti/jwks",
    },
  });

  console.log(`BFF running on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
