# ecommerce-bdd

A fuller BDD suite over a realistic e-commerce API: auth, profile, products,
cart, checkout, orders, password reset, and addresses. The scenarios are the
classic given/when/then flows you would write for a shop.

The service ([service/server.js](./service/server.js)) is in memory with token
based sessions and no dependencies, and it starts in process, so there is
nothing to set up.

## Run

```bash
npm install
npm test          # node --test -> 20 scenarios
```

## Scenarios

20 scenarios across these features:

- Login: valid credentials, invalid password
- Profile: shows the logged in user
- Products: search lists matches
- Cart: add a product, total is correct, increasing quantity updates the total, removing a product
- Checkout: valid payment succeeds, invalid card is rejected
- Registration: valid details create an account, empty fields are rejected
- Logout: redirects to the login page
- Orders: order details, order history
- Password reset: registered email, unregistered email
- Addresses: add, update, delete

## How a scenario maps to HTTP

```js
scenario("the cart total is calculated correctly", [
  Given("the user has a product in the cart", async (w) => {
    await loginFreshUser(w);
    await api.post("/cart/items").bearer(w.token).json({ productId: 1, quantity: 2 }).expectStatus(201);
  }),
  When("the user opens the cart page", async (w) => {
    w.res = await api.get("/cart").bearer(w.token);
  }),
  Then("the cart total should be calculated correctly", (w) =>
    w.res.expectStatus(200).expectJson("total", 50)),
]);
```

Scenarios that need a logged in user register and log in a fresh account in the
Given step, so they do not interfere with each other.
