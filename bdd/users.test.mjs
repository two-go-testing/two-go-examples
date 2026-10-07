// BDD scenarios for the user service using the package's own BDD layer
// (two-go/bdd), run with: node --test. feature() builds a labelled list of
// scenarios; each scenario(steps) is an async function we hand to node:test.
import { test, before, after } from "node:test";
import { go } from "two-go";
import { feature, Given, When, Then, And } from "two-go/bdd";
import { createServer } from "./service/server.js";

let server;
let api;
const client = () => api;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  api = go(`http://localhost:${server.address().port}`);
});

after(() => server.close());

// A unique email per scenario keeps the in-memory store from colliding.
let seq = 0;
const uniqueEmail = () => `user${seq++}@example.com`;

// Register every scenario in a feature with the Node test runner.
const register = (scenarios) => {
  for (const s of scenarios) test(s.name, s.run);
};

register(feature("POST /users", {
  "creates a user with valid data": [
    Given("a valid user payload", (w) => {
      w.payload = { name: "Ada", email: uniqueEmail(), role: "admin" };
    }),
    When("the user is created", async (w) => {
      w.res = await client().post("/users").json(w.payload);
    }),
    Then("the response is 201 Created", (w) => w.res.expectStatus(201)),
    And("the body echoes the name and email", (w) =>
      w.res.expectJson("name", "Ada").expectJson("email", w.payload.email)),
    And("an id was assigned", (w) => w.res.expectValue("id").toBeGreaterThan(0)),
  ],
  "rejects a missing name": [
    Given("a payload with no name", (w) => {
      w.payload = { email: uniqueEmail() };
    }),
    When("the user is created", async (w) => {
      w.res = await client().post("/users").json(w.payload);
    }),
    Then("the response is 400", (w) => w.res.expectStatus(400)),
    And("the error explains the missing name", (w) =>
      w.res.expectJson("error", "name is required")),
  ],
  "rejects an invalid email": [
    Given("a payload with a malformed email", (w) => {
      w.payload = { name: "Bob", email: "not-an-email" };
    }),
    When("the user is created", async (w) => {
      w.res = await client().post("/users").json(w.payload);
    }),
    Then("the response is 400", (w) => w.res.expectStatus(400)),
    And("the error explains the invalid email", (w) =>
      w.res.expectJson("error", "email is invalid")),
  ],
  "rejects a duplicate email": [
    Given("an email that is already used", async (w) => {
      w.email = uniqueEmail();
      await client().post("/users").json({ name: "First", email: w.email }).expectStatus(201);
    }),
    When("a second user uses the same email", async (w) => {
      w.res = await client().post("/users").json({ name: "Second", email: w.email });
    }),
    Then("the response is 409 Conflict", (w) => w.res.expectStatus(409)),
    And("the error explains the conflict", (w) =>
      w.res.expectJson("error", "email already exists")),
  ],
}));

register(feature("GET /users", {
  "lists users with a matching count": [
    Given("at least one user exists", async () => {
      await client().post("/users").json({ name: "Listed", email: uniqueEmail() }).expectStatus(201);
    }),
    When("the list is fetched", async (w) => {
      w.res = await client().get("/users");
    }),
    Then("the response is 200", (w) => w.res.expectOk()),
    And("count matches the number of returned users", (w) =>
      w.res.check("count matches data length", (r) => r.get("count") === r.get("data").length)),
  ],
}));

register(feature("GET /users/:id", {
  "returns an existing user": [
    Given("a created user", async (w) => {
      const created = await client().post("/users").json({ name: "Grace", email: uniqueEmail() });
      w.id = created.get("id");
    }),
    When("that user is fetched by id", async (w) => {
      w.res = await client().get(`/users/${w.id}`);
    }),
    Then("the response is 200", (w) => w.res.expectStatus(200)),
    And("the returned id matches", (w) => w.res.expectJson("id", w.id)),
  ],
  "returns 400 for a non numeric id": [
    When("an id that is not a number is requested", async (w) => {
      w.res = await client().get("/users/abc");
    }),
    Then("the response is 400", (w) => w.res.expectStatus(400)),
    And("the error explains the bad id", (w) => w.res.expectJson("error", "id must be a number")),
  ],
  "returns 404 for an unknown id": [
    When("a missing id is requested", async (w) => {
      w.res = await client().get("/users/999999");
    }),
    Then("the response is 404", (w) => w.res.expectStatus(404)),
    And("the error says not found", (w) => w.res.expectJson("error", "user not found")),
  ],
}));

register(feature("DELETE /users/:id", {
  "deletes an existing user": [
    Given("a created user", async (w) => {
      const created = await client().post("/users").json({ name: "Temp", email: uniqueEmail() });
      w.id = created.get("id");
    }),
    When("the user is deleted", async (w) => {
      w.res = await client().delete(`/users/${w.id}`);
    }),
    Then("the response is 204 No Content", (w) => w.res.expectStatus(204)),
    And("the user can no longer be fetched", async (w) => {
      await client().get(`/users/${w.id}`).expectStatus(404);
    }),
  ],
  "returns 404 when deleting an unknown id": [
    When("a missing id is deleted", async (w) => {
      w.res = await client().delete("/users/999999");
    }),
    Then("the response is 404", (w) => w.res.expectStatus(404)),
  ],
  "returns 400 when deleting a non numeric id": [
    When("a non numeric id is deleted", async (w) => {
      w.res = await client().delete("/users/xyz");
    }),
    Then("the response is 400", (w) => w.res.expectStatus(400)),
  ],
}));
