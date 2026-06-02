import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createLtiApp } from "../src/app";


let lti: any;

beforeAll(async () => {

    lti = await createLtiApp();
    // Deploy in serverless mode so it connects to MongoDB and validates setup
    await lti.deploy({ serverless: false });
}, 5000);

afterAll(async () => {
    if (lti) {
        await lti.close();
    }
});

describe("Dummy submit", () => {
    it("does something", async () => {

        const d = await request(lti.app).get("/debug");
        console.log(d.body);

        const res = await request(lti.app)
            .post("/api/submit-dummy")
            .send({
                correct: 3,
                total: 5,
            });
        console.log(res.body);

        expect(res.status).toBe(200);
    });

});
