# joltax — Claude Code plugin marketplace

A single-source marketplace for the **sbrain** workflow plugin and its future
stack profiles. Push here once; every machine and project updates from here.

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

## Notes

- The repo must be public (or reachable via your git credentials) for
  `/plugin marketplace add` to fetch it.
- Marketplace name `joltax` is set in `marketplace.json`; install syntax is
  always `<plugin>@<marketplace-name>`, independent of the repo name.
