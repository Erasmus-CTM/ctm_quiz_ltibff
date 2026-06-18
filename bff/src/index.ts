import "dotenv/config";
import { createLtiApp } from "./app";

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  const Lti: any = await createLtiApp();

  console.log("Deploying LTI...");
  await Lti.deploy({ port: PORT });

  // In dev/test, always start fresh so platform config changes take effect
  if (process.env.NODE_ENV !== 'production') {
    console.log("Dev mode: clearing platform registrations...");
    const platforms = await Lti.getAllPlatforms();
    for (const platform of platforms ?? []) {
      const url = await platform.platformUrl();
      const clientId = platform.clientId;
      console.log(`DELETING: ${url}, ??`);

      await Lti.deletePlatform(url, "mock-client-id-12345");
    }
  }
  console.log("Registering platform...");
  const platformCfg = {
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
  }
  await Lti.registerPlatform(platformCfg);

  console.log(`BFF running on http://localhost:${PORT}, LMS Platform config:`);
  console.log(platformCfg)
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
