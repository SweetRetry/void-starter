# Observability

The Worker's logs and traces are the record of what a request did. The `cf-ray` id ties a user's error report to that record: every `/api/*` error carries it as `instance: "urn:cf-ray:<id>"` ([api.md](api.md)).

## Logging

- Log with `console.log`, `console.warn` and `console.error`. Workers Logs captures them and attaches them to the request's trace.
- Name events with a short dotted key and put the data in an object: `console.error("api.failed", { path, error })`.
- Log an `Error` as `{ name, message, stack }`. A raw `Error` serializes to `{}`.
- Never log secrets, cookies, session tokens, passwords or full request bodies.

## Local dev

The Cloudflare Vite plugin records every request's spans and logs while `pnpm dev` runs. Browse them at <http://localhost:5173/cdn-cgi/local/explorer/>, or query them with SQL:

```sh
curl -s http://localhost:5173/cdn-cgi/local/explorer/api/local/observability/query \
  -H 'content-type: application/json' \
  -d '{"sql": "select trace_id, level, message from logs where level = '\''error'\'' order by ts_ms desc limit 5"}'
```

Two tables hold the data:

| Table   | Columns                                                                                                                    |
| :------ | :------------------------------------------------------------------------------------------------------------------------- |
| `spans` | `trace_id`, `span_id`, `parent_id`, `service`, `name`, `kind`, `start_ms`, `duration_ms`, `outcome`, `error`, `attributes` |
| `logs`  | `trace_id`, `span_id`, `seq`, `ts_ms`, `level`, `message`, `operation`                                                     |

A request's root span has `parent_id` null. Join `logs` to `spans` on `trace_id` to see what one request logged:

```sql
select s.name, s.duration_ms, l.level, l.message
from spans s join logs l on l.trace_id = s.trace_id
where s.parent_id is null and l.level = 'error'
order by l.ts_ms desc limit 10;
```

Local requests have no `cf-ray`, so local errors carry no `instance`. Find them by time or path instead.

## Production

`void.config.ts` turns on Workers Logs and Traces through the Wrangler `observability` settings:

```ts
cloudflare: {
  observability: {
    enabled: true,
    logs: { enabled: true, invocation_logs: true },
    traces: { enabled: true },
  },
},
```

- **Dashboard.** Workers & Pages › your Worker › Observability shows logs and traces. Filter by the ray id from an error's `instance`.
- **Live tail.** `pnpm --filter web exec void project logs` streams logs from the deployed Worker.
- **AI.** AI Gateway's logs show each model call, with its latency, tokens and cache status.
