# bdd

BDD style scenarios using two-go's built-in BDD layer, `two-go/bdd`. It gives
you `feature / scenario / Given / When / Then / And`, runner-agnostic, so `scenario()`
returns an async function you hand to the Node test runner. two-go's throwing
assertions are what make each step pass or fail.

It tests a small in-memory user service ([service/server.js](./service/server.js))
with four endpoints, and the service starts in process, so there is nothing to
set up.

## Run

```bash
npm install
npm test          # runs: node --test
```

## What it covers

| Endpoint | Success | Validation and edge cases |
| -------- | ------- | ------------------------- |
| `POST /users` | creates with valid data (201) | missing name (400), invalid email (400), duplicate email (409) |
| `GET /users` | lists users, count matches (200) | |
| `GET /users/:id` | returns an existing user (200) | non numeric id (400), unknown id (404) |
| `DELETE /users/:id` | deletes, then 404 on refetch (204) | unknown id (404), non numeric id (400) |

## A scenario reads like this

```js
scenario("creates a user with valid data", [
  Given("a valid user payload", (w) => { w.payload = { name: "Ada", email: "ada@example.com" }; }),
  When("the user is created", async (w) => { w.res = await api.post("/users").json(w.payload); }),
  Then("the response is 201 Created", (w) => w.res.expectStatus(201)),
  And("the body echoes the name", (w) => w.res.expectJson("name", "Ada")),
]);
```

The `world` object (`w`) carries state between steps: a `when` stashes the
response and a `then` asserts on it.
