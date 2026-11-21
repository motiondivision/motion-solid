# Triage Labels

Skills and agents speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Canonical role    | Label in our tracker | Meaning                                  |
| ----------------- | -------------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human`    | Requires human implementation            |
| `wontfix`         | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Creating the labels

The labels must exist on the GitHub repo before they can be applied. A maintainer creates them once:

```bash
gh label create needs-triage    --description "Maintainer needs to evaluate this issue"  --color FBCA04
gh label create needs-info      --description "Waiting on reporter for more information" --color D4C5F9
gh label create ready-for-agent --description "Fully specified, ready for an AFK agent"  --color 0E8A16
gh label create ready-for-human --description "Requires human implementation"            --color 1D76DB
gh label create wontfix         --description "Will not be actioned"                     --color FFFFFF
```

## What "ready-for-agent" means here

An issue is ready for an agent only when it names the files or subsystem (see [architecture.md](architecture.md)), states the expected behavior in terms of the React or motion-vue original, and has an acceptance check an agent can run (a vitest test, `pnpm typecheck`, `pnpm build`, or `pnpm --filter motion-solid parity`). Anything that needs a naming or parity decision is `ready-for-human` until [ADR-0001](../adr/0001-parity-policy.md) covers it.
