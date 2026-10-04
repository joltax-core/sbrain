# joltax — Claude Code plugin marketplace

A single-source marketplace for the **sbrain** workflow plugin and its stack
profiles (NestJS backend, Vue admin-dashboard frontend). Push here once; every
machine and project updates from here.

## Install

```bash
# inside Claude Code
/plugin marketplace add joltax-core/sbrain
/plugin install sbrain@joltax
```

After updates are pushed to this repo:

```bash
/plugin marketplace update joltax
/reload-plugins
```

Or enable auto-update: `/plugin` → Marketplaces → joltax → Auto-update.

## Make a project pull it in automatically (team mode)

Commit this to a project's `.claude/settings.json` and teammates get prompted to
install when they trust the folder:

```json
{
  "extraKnownMarketplaces": {
    "joltax": {
      "source": { "source": "github", "repo": "joltax-core/sbrain" }
    }
  },
  "enabledPlugins": {
    "sbrain@joltax": true
  }
}
```

## Layout

```
.claude-plugin/marketplace.json   <- catalog (name, owner, plugin list)
plugins/sbrain/               <- the plugin (see its README)
.github/workflows/validate.yml    <- CI: `claude plugin validate` on every push/PR
```

## Adding the next plugin (e.g. a stack profile promoted out of sbrain)

1. Create `plugins/<name>/.claude-plugin/plugin.json` + its components.
2. Add an entry to `.claude-plugin/marketplace.json` (`"source": "./plugins/<name>"`).
3. `claude plugin validate .` locally; push. CI re-validates.

## Versioning discipline

- Bump the plugin's `version` in its `plugin.json` on every behavioral change.
- Harvest cycle: confirmed learnings accumulate in projects' `.agent/memory/STACK.md`;
  promote them into the relevant skill here, bump the version, push. Every project
  inherits the sharpened rules on its next `marketplace update`.

## Three prompts to try (core functionality)

1. In an empty repo: **`bootstrap`** — sbrain interviews you (stack, DB, auth,
   concerns, first modules) and scaffolds `.agent/`, a *filled* ARCHITECTURE.md,
   module contracts, and TASK-001.
2. In a bootstrapped project: **`start`** — the session-start skill fetches,
   checks main/develop drift, detects Clean Start vs Resume from git, reconciles
   state files, and delivers a Session Start Summary before any code is touched.
3. During work: **"npm install lodash"** — watch the guard: sbrain blocks it
   deterministically with the pnpm rule (hooks enforce what prose can't).

## Troubleshooting

- **Skills don't autocomplete under `/sbrain:`** — check `/plugin` shows sbrain
  enabled; if freshly pushed, run `/plugin marketplace update joltax` then
  `/reload-plugins`.
- **A skill loads but never triggers** — its YAML frontmatter may be broken;
  run `claude plugin validate plugins/sbrain` (an unquoted `: ` inside a
  description silently drops all metadata).
- **Guards fire in the wrong project** — they activate only when a `.agent/`
  directory exists in the cwd or a parent; remove it or work elsewhere.
- **A git command is blocked with `sbrain guard:`** — that is intentional
  enforcement; read the message, it names the rule and the correct alternative.
- **INDEX.md looks wrong** — never hand-edit it; run
  `bash plugins/sbrain/scripts/reindex.sh` inside the project.

## Support

- Bugs & features: [GitHub Issues](https://github.com/joltax-core/sbrain/issues)
  (templates provided — including **Stack Learning** for promoting confirmed
  patterns from your project's `.agent/memory/STACK.md` into sbrain)
- Contact: support@joltax.com
- Contributing: see [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE) © 2026 Joltax

## Notes

- The repo must be public (or reachable via your git credentials) for
  `/plugin marketplace add` to fetch it.
- Marketplace name `joltax` is set in `marketplace.json`; install syntax is
  always `<plugin>@<marketplace-name>`, independent of the repo name.
