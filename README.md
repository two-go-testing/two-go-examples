# two-go-examples

Runnable examples for [two-go](https://github.com/two-go-testing/two-go), the
zero-dependency API testing library.

Each folder is self contained. Install two-go and run.

| Example | What it shows |
| ------- | ------------- |
| [basic](./basic) | Write a suite in a `*.twogo.mjs` file and run it with the built-in CLI. |
| [node-test](./node-test) | Use two-go inside the Node test runner (`node --test`). |
| [bdd](./bdd) | BDD style scenarios (Given/When/Then) over a user service, with success, validation, and edge cases. |
| [ecommerce-bdd](./ecommerce-bdd) | A fuller BDD suite (20 scenarios) over a shop API: auth, cart, checkout, orders, addresses. |
| [cucumber](./cucumber) | Real Gherkin `.feature` files run with cucumber-js, with two-go in the step definitions. |
| [contract](./contract) | Contract and regression testing: explicit schema, inferred schema, and snapshots. |
| [async-jobs](./async-jobs) | Wait for async work with `pollUntil` and `eventually`. |
| [performance](./performance) | A light p95 latency check with `mapLimit`. |
| [data-driven](./data-driven) | Table driven tests plus faker generated payloads. |
| [jest](./jest) | two-go inside Jest (ESM). |
| [vitest](./vitest) | two-go inside Vitest. |
| [mocha](./mocha) | two-go inside Mocha. |
| [typescript](./typescript) | A typed `.ts` example using the shipped types. |
| [mock-server](./mock-server) | Isolate a service by mocking its upstream dependency. |
| [ai](./ai) | The AI layer (test gen, explain, review) with a stub provider, no key needed. |
| [ci](./ci) | A GitHub Actions workflow that runs every example. |
| [microservice](./microservice) | Test a microservice brought up with Docker Compose alongside MySQL and MSSQL. |

The basic and node-test examples hit a public test API
(`https://jsonplaceholder.typicode.com`), so they run without any backend.

## Quick start

```bash
cd basic
npm install
npm test
```

## License

MIT
