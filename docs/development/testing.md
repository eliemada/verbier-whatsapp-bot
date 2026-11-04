# Testing

Run `npm test` for the Vitest suite, or `npm run test:coverage` for coverage output in `coverage/`.

The suite covers:

- WAHA HTTP authentication, group image payloads, receipt lookup, session creation and restart-safe configuration.
- Authenticated webhooks, owner/group reply routing, duplicate suppression across restarts, history filtering and ambiguous failure handling.
- The loopback operator API, webcam fallback, historical errors, weather formatting and timezone parsing.

HTTP adapter and webhook tests use local servers and isolated temporary directories. Unit tests do not require a live WhatsApp account or send real messages.

Before deploying a transport change, verify one live image/weather message in the intended WhatsApp group, then restart both services and check that the persisted session reconnects. An API acknowledgement proves acceptance, while actual group receipt should also be checked; some GOWS group delivery receipts can remain pending.

CI runs lint, formatting and tests on Node.js 22 and 24. Production dependencies can be checked separately with `npm audit --omit=dev`.
