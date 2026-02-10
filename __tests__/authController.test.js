const request = require("supertest");
const express = require("express");

const authRoutes = require("../src/routes/auth");

// Minimal express app wired with the auth routes for testing
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

describe("Auth routes basic contract", () => {
  it("should return 400 when required fields are missing on admin registration request", async () => {
    // /admin/request is the public registration endpoint (no auth required)
    const res = await request(app).post("/api/auth/admin/request").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should return 400 when required fields are missing on login", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});