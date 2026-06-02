import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createLtiApp } from "../src/app";

let lti: any;

beforeAll(async () => {
  lti = await createLtiApp();
  // Deploy in serverless mode so it connects to MongoDB and validates setup
  await lti.deploy({ serverless: true });
}, 5000);

afterAll(async () => {
  if (lti) {
    await lti.close();
  }
});

describe("Application Boot & Dependencies", () => {
  it("serves health check (without authorization)", async () => {
    const res = await request(lti.app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("has a database provider ready", () => {
    // 1 means MongoDB is successfully connected
    expect(lti.Database.db.readyState).toBe(1);
  });

  it("protects LTI endpoints", async () => {
    // Ensuring the LTI engine is listening on /lti
    const res = await request(lti.app).get("/lti");

    expect(res.status).toBe(401);
    expect(res.body.details.message).toBe("NO_LTIK_OR_IDTOKEN_FOUND");
  });
});
