# Guitar shop + repairs

Bilingual (English/Arabic) site for a home-based electric guitar shop and repair service in Ras Al Khaimah, UAE.

- Plan, decisions and milestones: [`docs/PLAN.md`](docs/PLAN.md)
- Conventions and commands: [`CLAUDE.md`](CLAUDE.md)

## Run it locally

Needs Node 22 and pnpm 10.

```sh
pnpm install
cp .env.example .env.local   # then edit; startup fails with a list of anything missing
pnpm dev
```

Checks (all run in CI on every PR):

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```
