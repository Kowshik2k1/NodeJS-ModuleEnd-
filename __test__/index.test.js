const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../index");

beforeAll(async () => {
  await mongoose.connect(process.env.URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("items API", () => {
    it("GET /items → returns all items", async () => {
        const res = await request(app).get("/items");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /items/100 → 404 for not found book", async () => {
        const res = await request(app).get("/items/100");
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    it("POST /items → success", async () => {
        const newItem = { name: "Jakie Chan", description: "Adventurous cartoon book" };
        const res = await request(app).post("/items").send(newItem);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
    });

    it("POST /items → validation failure", async () => {
        const res = await request(app).post("/items").send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toBeDefined();
    });
});
