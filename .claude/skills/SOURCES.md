# Skill sources

Vendored copies of third-party Claude Code skills. Files are plain copies (no symlinks).
To update one, re-copy from the source path below at a newer commit and bump the hash here.

| Skill | Source repo | Path in source repo | Commit copied from | License |
|---|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | `skills/frontend-design/` | `dbd4588f9e1033efb41dad4bef2f7947c8993d44` | see `frontend-design/LICENSE.txt` |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/react-best-practices/` | `063bee94c3f4df8453406c830b0a7df0f2860278` | MIT (per SKILL.md) |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `skills/web-design-guidelines/` | `063bee94c3f4df8453406c830b0a7df0f2860278` | MIT (repo) |
| `insecure-defaults` | [trailofbits/skills](https://github.com/trailofbits/skills) | `plugins/insecure-defaults/skills/insecure-defaults/` | `9ea55c598763f7cb87ab56933d773d7dc34344a0` | CC BY-SA 4.0 (`insecure-defaults/LICENSE`) |

## Notes

- **vercel-react-best-practices**: the directory in the source repo is named `react-best-practices`;
  the skill's own `name:` is `vercel-react-best-practices`, which is used here. Copied `SKILL.md`,
  `AGENTS.md`, `README.md`, `metadata.json` and all of `rules/`.
- **web-design-guidelines**: the skill has no local rule files. At run time it fetches its rules from
  `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
  (unpinned `main` branch), so its behaviour can change without this repo changing.
- **insecure-defaults**: trailofbits/skills HEAD at the time of copying
  (`196a9073ab10d35bacf111f945e02c00b2c6883a`) no longer ships this as a skill. Commit `82e8e0a`
  ("convert the skill to a dynamic workflow", #224) replaced the `SKILL.md` with a plugin command plus
  a JavaScript workflow (`workflows/audit.js`) that needs the plugin runtime. The copy here is the last
  plain-skill version, from the parent of that commit (`9ea55c5`). Only `SKILL.md` and
  `references/examples.md` were taken; the Codex UI metadata (`agents/openai.yaml`) and its icon were
  left out because Claude Code does not use them. To get the newer workflow version, install the
  plugin instead (`/plugin install insecure-defaults` from the trailofbits marketplace).
