# Job Finder documentation

How the app is built, and why it's built that way.

| Doc | What it covers |
| --- | --- |
| [Architecture](architecture.md) | Stack, folder layout, how a request flows, and why each piece was chosen |
| [Authentication](authentication.md) | Magic-link sign-in, the single-owner rule, sessions, middleware and the cron secret |
| [Data model](data-model.md) | Tables, columns, row-level security and migrations |
| [Job-finding agent](job-agent.md) | Sources, filtering, Claude scoring, costs and limits |
| [Applying](applying.md) | Toggles, tailored CVs and cover emails, Gmail drafts (sending is off by default), and how Applications fill in |
| [Operations](operations.md) | Environment variables, local setup, deploying, the daily cron and troubleshooting |
| [Decisions](decisions.md) | A log of product and technical decisions, with the reasoning |

Start with the architecture doc if you're new to the codebase.
