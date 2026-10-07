// End to end BDD scenarios for the e-commerce service, run with: node --test.
// The service starts in process on a random port. Scenarios that need a logged
// in user register and log in a fresh account so they stay independent.
import { test, before, after } from "node:test";
import { go } from "two-go";
import { scenario as makeScenario, Given, When, Then, And } from "two-go/bdd";
import { createServer } from "./service/server.js";

// Grouping sugar over two-go/bdd: Given/When/Then/And and scenario() come from
// the package; feature() just registers each scenario as a node:test test named
// "Feature: scenario".
let currentFeature = null;
function feature(name, build) {
  const previous = currentFeature;
  currentFeature = name;
  build();
  currentFeature = previous;
}
function scenario(title, steps) {
  test(currentFeature ? `${currentFeature}: ${title}` : title, makeScenario(steps));
}

let server;
let api;
const client = () => api;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  api = go(`http://localhost:${server.address().port}`);
});

after(() => server.close());

let seq = 0;
const uniqueEmail = () => `user${seq++}@example.com`;

// Register and log in a fresh user, stashing the token on the world.
async function loginFreshUser(w) {
  w.email = uniqueEmail();
  await client().post("/register").json({ name: "Test User", email: w.email, password: "Secret123" }).expectStatus(201);
  const res = await client().post("/login").json({ email: w.email, password: "Secret123" }).expectStatus(200);
  w.token = res.get("token");
}

feature("Login", () => {
  scenario("valid username and password logs in", [
    Given("the user is on the login page", () => {}),
    When("the user enters valid username and password", async (w) => {
      w.res = await client().post("/login").json({ email: "demo@example.com", password: "Secret123" });
    }),
    Then("the user should be logged in successfully", (w) => w.res.expectStatus(200)),
    And("a session token is returned", (w) => w.res.expectValue("token").toBeType("string")),
  ]);

  scenario("an invalid password is rejected", [
    Given("the user is on the login page", () => {}),
    When("the user enters an invalid password", async (w) => {
      w.res = await client().post("/login").json({ email: "demo@example.com", password: "wrong" });
    }),
    Then("an error message should be displayed", (w) =>
      w.res.expectStatus(401).expectJson("error", /invalid/i)),
  ]);
});

feature("Profile", () => {
  scenario("shows the logged in user information", [
    Given("the user is logged into the system", (w) => loginFreshUser(w)),
    When("the user opens the profile page", async (w) => {
      w.res = await client().get("/profile").bearer(w.token);
    }),
    Then("the user information should be displayed correctly", (w) =>
      w.res.expectStatus(200).expectJson("email", w.email)),
  ]);
});

feature("Products", () => {
  scenario("search lists matching products", [
    Given("the user is on the product listing page", () => {}),
    When("the user searches for a product", async (w) => {
      w.res = await client().get("/products").query({ search: "Mouse" });
    }),
    Then("matching products should be listed", (w) =>
      w.res.expectStatus(200).expectJson("data[0].name", /mouse/i)),
  ]);
});

feature("Cart", () => {
  scenario("adding a product shows it in the cart", [
    Given("the user is on the product detail page", async (w) => {
      await loginFreshUser(w);
      await client().get("/products/1").expectStatus(200);
    }),
    When("the user adds the product to the cart", async (w) => {
      w.res = await client().post("/cart/items").bearer(w.token).json({ productId: 1 });
    }),
    Then("the product should be displayed in the cart", (w) =>
      w.res.expectStatus(201).expectJson("items[0].productId", 1)),
  ]);

  scenario("the cart total is calculated correctly", [
    Given("the user has a product in the cart", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 1, quantity: 2 }).expectStatus(201);
    }),
    When("the user opens the cart page", async (w) => {
      w.res = await client().get("/cart").bearer(w.token);
    }),
    Then("the cart total should be calculated correctly", (w) =>
      w.res.expectStatus(200).expectJson("total", 50)), // 25 * 2
  ]);

  scenario("increasing quantity updates the total", [
    Given("the user has a product in the cart", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 1, quantity: 1 }).expectStatus(201);
    }),
    When("the user increases the product quantity", async (w) => {
      w.res = await client().patch("/cart/items/1").bearer(w.token).json({ quantity: 3 });
    }),
    Then("the cart total should be updated", (w) =>
      w.res.expectStatus(200).expectJson("total", 75)), // 25 * 3
  ]);

  scenario("removing a product takes it out of the cart", [
    Given("the user has a product in the cart", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 1 }).expectStatus(201);
    }),
    When("the user removes the product from the cart", async (w) => {
      await client().delete("/cart/items/1").bearer(w.token).expectStatus(200);
      w.res = await client().get("/cart").bearer(w.token);
    }),
    Then("the product should no longer be displayed in the cart", (w) =>
      w.res.expectStatus(200).expectJson("items", [])),
  ]);
});

feature("Checkout", () => {
  scenario("valid payment completes the order", [
    Given("the user is on the checkout page", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 3 }).expectStatus(201);
    }),
    When("the user enters valid payment information", async (w) => {
      w.res = await client().post("/checkout").bearer(w.token)
        .json({ card: { number: "4111111111111111", expiry: "12/29", cvc: "123" } });
    }),
    Then("the payment should be completed successfully", (w) =>
      w.res.expectStatus(200).expectJson("status", "paid")),
  ]);

  scenario("invalid card information is rejected", [
    Given("the user is on the checkout page", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 3 }).expectStatus(201);
    }),
    When("the user enters invalid card information", async (w) => {
      w.res = await client().post("/checkout").bearer(w.token)
        .json({ card: { number: "1234", expiry: "12/29", cvc: "1" } });
    }),
    Then("the payment should be rejected", (w) =>
      w.res.expectStatus(402).expectJson("error", /rejected/i)),
  ]);
});

feature("Registration", () => {
  scenario("valid details create a new account", [
    Given("the user is on the registration page", () => {}),
    When("the user fills all required fields correctly", async (w) => {
      w.res = await client().post("/register").json({ name: "New", email: uniqueEmail(), password: "Secret123" });
    }),
    Then("a new account should be created", (w) => w.res.expectStatus(201).expectValue("id").toBeGreaterThan(0)),
  ]);

  scenario("empty required fields are rejected", [
    Given("the user is on the registration page", () => {}),
    When("the user leaves required fields empty", async (w) => {
      w.res = await client().post("/register").json({});
    }),
    Then("validation messages should be displayed", (w) =>
      w.res.expectStatus(400).expectValue("error").toBeType("string")),
  ]);
});

feature("Logout", () => {
  scenario("logging out redirects to the login page", [
    Given("the user is logged into the system", (w) => loginFreshUser(w)),
    When("the user logs out", async (w) => {
      w.res = await client().post("/logout").bearer(w.token);
    }),
    Then("the user should be redirected to the login page", (w) =>
      w.res.expectStatus(200).expectJson("redirectTo", "/login")),
  ]);
});

feature("Orders", () => {
  scenario("selecting an order shows its details", [
    Given("the user has completed an order", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 2 }).expectStatus(201);
      const checkout = await client().post("/checkout").bearer(w.token)
        .json({ card: { number: "4111111111111111", expiry: "12/29", cvc: "123" } });
      w.orderId = checkout.get("orderId");
    }),
    When("the user selects an order", async (w) => {
      w.res = await client().get(`/orders/${w.orderId}`).bearer(w.token);
    }),
    Then("the order details should be displayed", (w) =>
      w.res.expectStatus(200).expectJson("id", w.orderId).expectJson("status", "paid")),
  ]);

  scenario("completed orders appear in the order history", [
    Given("the user has completed an order", async (w) => {
      await loginFreshUser(w);
      await client().post("/cart/items").bearer(w.token).json({ productId: 2 }).expectStatus(201);
      await client().post("/checkout").bearer(w.token)
        .json({ card: { number: "4111111111111111", expiry: "12/29", cvc: "123" } }).expectStatus(200);
    }),
    When("the user opens the order history page", async (w) => {
      w.res = await client().get("/orders").bearer(w.token);
    }),
    Then("the completed order should be listed", (w) =>
      w.res.expectStatus(200).check("has at least one order", (r) => r.get("count") >= 1)),
  ]);
});

feature("Password reset", () => {
  scenario("a registered email triggers a reset email", [
    Given("the user is on the password reset page", () => {}),
    When("the user enters a registered email address", async (w) => {
      w.res = await client().post("/password-reset").json({ email: "demo@example.com" });
    }),
    Then("a password reset email should be sent", (w) =>
      w.res.expectStatus(200).expectJson("message", /reset email/i)),
  ]);

  scenario("an unregistered email shows a warning", [
    Given("the user is on the password reset page", () => {}),
    When("the user enters an unregistered email address", async (w) => {
      w.res = await client().post("/password-reset").json({ email: "nobody@example.com" });
    }),
    Then("an appropriate warning message should be displayed", (w) =>
      w.res.expectStatus(404).expectJson("error", /no account/i)),
  ]);
});

feature("Addresses", () => {
  scenario("a new address is saved", [
    Given("the user is on the address page", (w) => loginFreshUser(w)),
    When("the user adds a new address", async (w) => {
      w.res = await client().post("/addresses").bearer(w.token).json({ line: "1 Main St", city: "Istanbul" });
    }),
    Then("the address should be saved successfully", (w) =>
      w.res.expectStatus(201).expectJson("city", "Istanbul")),
  ]);

  scenario("a saved address is updated", [
    Given("the user has a saved address", async (w) => {
      await loginFreshUser(w);
      const created = await client().post("/addresses").bearer(w.token).json({ line: "1 Main St", city: "Istanbul" });
      w.id = created.get("id");
    }),
    When("the user updates the address information", async (w) => {
      w.res = await client().patch(`/addresses/${w.id}`).bearer(w.token).json({ city: "Ankara" });
    }),
    Then("the updated address should be displayed", (w) =>
      w.res.expectStatus(200).expectJson("city", "Ankara")),
  ]);

  scenario("a saved address is deleted", [
    Given("the user has a saved address", async (w) => {
      await loginFreshUser(w);
      const created = await client().post("/addresses").bearer(w.token).json({ line: "1 Main St", city: "Istanbul" });
      w.id = created.get("id");
    }),
    When("the user deletes the address", async (w) => {
      await client().delete(`/addresses/${w.id}`).bearer(w.token).expectStatus(204);
      w.res = await client().get("/addresses").bearer(w.token);
    }),
    Then("the address should be removed from the address list", (w) =>
      w.res.expectStatus(200).check("address is gone", (r) => !r.get("data").some((a) => a.id === w.id))),
  ]);
});
