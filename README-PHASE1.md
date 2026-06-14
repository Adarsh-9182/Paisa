# Paisa — Phase 1 engine (the AI CFO core)

This extends the V1 repo with the proactive engine from the system design doc:
the **financial graph**, **recurring-series detection**, the **multi-agent layer**
with a **CFO orchestrator that resolves conflicts**, the **prediction engine**, and
a **daily run** that emits a grounded briefing.

> Same honesty as the rest of the repo: this runs on **seed data**, not real bank
> accounts. It is the real Phase 1 *engine*, not a product cleared to touch live
> money — that's still gated on the AA/FIU work. What's real here is the
> architecture and every number (all computed from the database, never a model).

## Run it

```bash
npm run db:reset      # apply new schema + reseed the richer scenario
npm run cfo:daily     # run the full pipeline and print today's briefing
npm run eval:agents   # assert the agents + CFO reconciliation are correct
```

`cfo:daily` prints something like:

```
┌──────────────────────────────────────────────────────────────────┐
│ PAISA — DAILY CFO BRIEFING                                         │
├──────────────────────────────────────────────────────────────────┤
│ Good morning, Riya.                                               │
│                                                                   │
│ 1. Your Axis MF SIP of ₹12,500 didn't go through this month...    │
│ 2. You have ₹60,000 of 80C room, but your runway is thin. So      │
│    here's the plan: invest ₹30,000 in ELSS now (captures ₹9,000   │
│    in tax), route ₹30,000 to your emergency fund...               │
│ 3. "Home down payment" is 28% funded. To hit ₹40,00,000...        │
│ 4. Cult.fit costs ₹1,500/mo — ₹18,000/year...                     │
│ ...                                                               │
├──────────────────────────────────────────────────────────────────┤
│ Runway 2.4 months · projected 90-day balance ₹...                 │
└──────────────────────────────────────────────────────────────────┘
```

## What was added

```
src/graph/recurring.ts   detect recurring SALARY/EMI/SIP/BILL/SUBSCRIPTION series;
                         flag overdue SIP/EMI as AT_RISK
src/graph/build.ts       materialise GraphNode/GraphEdge (the substrate)
src/agents/              types + 5 specialists (spending, tax, risk, goal,
                         investment) + cfo.ts (orchestrator)
src/predict/             cashflow + emergency-fund forecasts with confidence bands
src/engine/daily.ts      the pipeline:  detect → graph → predict → agents → CFO
src/engine/cli.ts        runnable entrypoint that prints the briefing
src/engine/queue.ts      in-process job runner + BullMQ/Redis swap sketch
src/eval/agents.*        eval that gates CI on agent correctness
prisma/schema.prisma     +Goal, RecurringSeries, GraphNode/Edge, Insight, Action,
                         Prediction, AuditLog, Account.balance
```

## The two ideas worth seeing in the code

**Numbers come from SQL; agents narrate.** Every `Insight.claim` is built from
figures the agent read out of the database, and carries `evidence` (the row ids
that prove it). The model layer (optional) only rephrases. `eval:agents` asserts
the figures so a wrong number can't merge.

**The CFO reconciles conflicts — that's the product.** When the Tax agent wants
to lock ₹60,000 in ELSS and the Risk agent says the emergency fund is thin, the
CFO doesn't pick a winner. `src/agents/cfo.ts → reconcile()` composes a plan:
invest part now to capture some tax, route the rest to the safety net, defer the
remainder. That trade-off, made automatically and explained, is the difference
between a budgeting app and a CFO.

## Production seams (deliberately left as swaps, not stubs)

- **Event-driven:** `engine/queue.ts` is an in-process runner. In prod, the AA
  "transaction ingested" webhook and a per-user morning cron enqueue `runDaily`
  jobs on BullMQ/Redis. The pipeline doesn't change.
- **Real data:** `detectRecurring`/`buildGraph` read the same tables AA ingestion
  will populate — swap the seed for live read-only AA data and the engine works
  unchanged.
- **Actions:** every suggested action is persisted as `Action[state=PROPOSED]`.
  Wiring the approval state machine (`PROPOSED → APPROVED → EXECUTED → …`) to
  real assisted-execution partners is the next phase.
- **LLM narration / personalization:** set `ANTHROPIC_API_KEY` to let a model
  rephrase the grounded claims; the Memory layer (approve/reject history) is the
  V3 personalization hook.

Requires Node 20+ (the scripts run via `tsx`, which resolves the `@/*` path alias
from `tsconfig.json`).
