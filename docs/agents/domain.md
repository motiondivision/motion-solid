# Domain Docs

How engineering skills and agents should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the glossary (Parity, Primitive, Context consumer, Accessor input, Ref factory, Motion State, Presence Context, …).
- **`docs/adr/`**: read the ADRs that touch the area you are about to work in. `0001-parity-policy.md` covers the `create*` vs `use*` naming rule and every intentional difference from the React version.
- **`docs/agents/porting-contract.md`**: the binding rules the port was built under (layout, Solid 2.0 conventions, Solid Primitives policy).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. Create them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── CLAUDE.md
├── docs/
│   ├── adr/
│   │   └── 0001-parity-policy.md
│   ├── agents/
│   │   ├── architecture.md
│   │   ├── domain.md
│   │   ├── issue-tracker.md
│   │   ├── porting-contract.md
│   │   └── triage-labels.md
│   └── upgrades/
│       └── motion-14-14-0.md
└── packages/motion/src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids: say **primitive**, not "hook" or "composable"; **ref factory**, not "directive"; **accessor input**, not "ref" or "getter prop".

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (no `use*` aliases), but worth reopening because…_

Adding a compatibility alias, a `use*` primitive, or a second entry point is exactly the kind of change that needs this flag. The ADR says the maintainer must ask explicitly first.
