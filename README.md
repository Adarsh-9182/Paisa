# Paisa

AI personal-finance agent for India. Spends, insurance, SIPs, taxes in one place,
answered in plain English/Hinglish — **with answers computed from your own numbers, not the model's imagination.**

> **Read this honestly.** This repo runs end to end on **seed data**. It is a
> production-*quality* scaffold, not a product that is safe to point at real bank
> accounts yet. Connecting real financial data requires an Account Aggregator
> (AA) integration through a licensed FIU/TSP, a registered legal entity, real
> auth (OTP), a security review, and lawyer-reviewed policies. Those are
> deliberately **not** faked here. See [The road to real data](#the-road-to-real-data).

---

## What's actually built

- **Landing page** matching Paisa's identity, with a **working** hero demo (sample data, labelled — no more dead "LIVE DEMO").
- **Auth** — email/password, bcrypt, signed-JWT session cookies, protected `/app` route via middleware.
- **The agent** — the part that matters. A deterministic pipeline:
  `question → route(intent) → tool(numbers from SQL) → narrate → persist`.
  The LLM **never** sees the database and **never** computes a number — it only rephrases verified facts.
- **Tool-grounded answers** for spend breakdown, salary flow, policy renewals, 80C/80D headroom, investments, affordability.
- **Postgres schema** (Prisma) with AA consents as first-class, revocable records.
- **Eval harness** asserting the exact rupee figures against seed data — wired into CI so a wrong number can't merge.
- **CI** (GitHub Actions): typecheck → eval → build.

## What's intentionally NOT built (and why)

Account Aggregator data ingestion (needs FIU/TSP partnership + legal entity),
real OTP auth, payments/subscriptions billing (Razorpay integration point is
modelled, not wired), team/family sharing, notifications. These are stubs or
omissions on purpose — building fake versions would be worse than honest gaps.

---

## Quickstart

Requires Node 20+ and Docker (or any Postgres URL).

```bash
cp .env.example .env
# generate a session secret and paste it into .env:
openssl rand -base64 48

docker compose up -d            # starts Postgres
npm install
npm run setup                   # prisma generate + db push + seed
npm run dev                     # http://localhost:3000
```

Sign in with the pre-loaded demo account:

```
demo@paisa.app  ·  demo1234
```

Ask things like *"Where did my salary go this month?"* or *"How much 80C room do I have left?"*.

**Optional LLM narration:** set `ANTHROPIC_API_KEY` in `.env`. Without it, the
agent answers with deterministic templates (still correct). With it, the same
grounded numbers get polished into warmer English/Hinglish. The model can never
change a number — if it tries to return junk, the code falls back to the verified baseline.

```bash
npm run eval        # run the grounded-number tests
npm run db:studio   # inspect the data
npm run db:reset    # wipe + reseed
```

---

## Architecture

```
question
   │
   ▼
router.ts        keyword intent classification (deterministic, testable)
   │
   ▼
tools.ts         runs SQL via Prisma → returns { fact, groundingRefs, baseline }
   │             (this is where every rupee figure is computed)
   ▼
narrator.ts      optional LLM rephrases the baseline; never invents numbers;
   │             degrades to the verified baseline on any failure
   ▼
index.ts         persists the turn + grounding refs to the messages table
```

Why this shape: a personal-finance product lives or dies on **correct numbers**.
A free-form "wrap an LLM" chatbot will eventually hallucinate a balance, and one
wrong figure about someone's money destroys trust permanently. Keeping
computation in SQL and the model in a narration-only role makes answers correct,
cheap, and auditable.

```
src/
  agent/        router, tools, narrator, orchestrator, types
  app/          landing, /login, protected /app, api routes, legal stubs
  components/   landing sections, chat panel, scripted hero demo
  lib/          db (prisma), session (jose), auth (bcrypt)
  eval/         grounded-number test cases + runner
prisma/         schema + deterministic seed
```

---

## The road to real data

Replace seed data with live AA data, in order:

1. **Become / partner as an FIU.** Consume AA data through a licensed Technology
   Service Provider (Setu, Finvu/Cookiejar, Anumati). This is the long pole —
   start it before anything else. It involves contracts, KYC, and sandbox access.
2. **Real auth.** Swap the demo email/password for phone-OTP (and/or an auth
   provider). The session layer here already issues real signed cookies.
3. **Consent flow.** Wire the AA consent journey into `/app` and write to the
   `Consent` table (already modelled, already revocable).
4. **Ingestion + categorisation.** Pull statements via the AA, write to
   `Transaction`, and run categorisation (start rules-based, layer ML later).
5. **Billing.** Add Razorpay/Stripe and gate features by `User.plan`.
6. **Compliance, before a single real user.** Lawyer-reviewed Privacy/Terms/
   Security pages (the stubs will fail you), DPDP obligations, and a clear line
   on SEBI investment-advice rules — keep the agent on analysis, not
   recommendations, unless/until registered.

**Paisa is not a SEBI-registered investment adviser.** Outputs are for the
user's own understanding and are not investment, tax, or legal advice.

---

## Notes

- Amounts are stored as integer rupees for demo clarity. Use a `Decimal` type in production.
- The "this month" window is a trailing 30 days so seed totals stay deterministic regardless of run date.
- Built with Next.js 14 (App Router), TypeScript, Postgres/Prisma, Tailwind, jose, Anthropic SDK.
