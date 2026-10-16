# Docs

`docs/` answers "what is this" and "how do I use it". It is the system knowledge base for developers and agents.

```text
docs/
  architecture.md   the stack, the decisions behind it, and where code lives
  api.md            the HTTP error contract and every problem type
  deployment.md     Cloudflare deploy, secrets, OAuth, AI Gateway, rollback
  observability.md  logs and traces, locally and in production
  future/           plans not decided yet, each with the signal that would trigger it
```

Routing across the repo (docs, rules, scripts) lives in [AGENTS.md](../AGENTS.md).
