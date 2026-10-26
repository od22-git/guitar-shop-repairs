# Guitar shop + repairs

Bilingual (English/Arabic) site for a home-based electric guitar shop and repair service in Ras Al Khaimah, UAE.

- Plan, decisions and milestones: [`docs/PLAN.md`](docs/PLAN.md)
- Conventions and commands: [`CLAUDE.md`](CLAUDE.md)

## Run it locally

Needs Node 22, pnpm 10 and a Postgres 16 database (local, or a Neon branch).

```sh
pnpm install
cp .env.example .env.local   # then edit; startup fails with a list of anything missing
pnpm db:migrate && pnpm db:seed   # needs the Postgres in DATABASE_URL
pnpm dev
```

Checks (all run in CI on every PR):

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

## The admin

The admin is at `/admin` (English, made for a phone at the bench). There's one admin
account and no email, so it's managed from the command line, against the database in
`DATABASE_URL`:

```sh
pnpm admin:create you@example.com --name "Your name"   # asks for a password (12+ characters)
pnpm admin:reset-password you@example.com              # forgotten password
pnpm admin:reset-2fa you@example.com                   # lost phone: set up 2FA again
```

Sign in right after creating the account: the first sign-in sets up two-factor sign-in
with an authenticator app, and shows backup codes to keep somewhere safe. Each reset
signs every session out.

Photos you upload are shrunk in the browser, then re-encoded on the server, which
removes EXIF and GPS data (photos taken at home would otherwise reveal the address).
With `STORAGE_DRIVER=fs` they're kept in `.data/storage`; production uses Cloudflare R2.
See [`docs/photo-shot-list.md`](docs/photo-shot-list.md) for how to photograph products.
