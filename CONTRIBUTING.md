# Contributing

## Branch Naming

Use short-lived branches with `codex/` prefix:

- `codex/feat/<scope>-<short-desc>`
- `codex/fix/<scope>-<short-desc>`
- `codex/ci/<scope>-<short-desc>`
- `codex/docs/<scope>-<short-desc>`

## Commit Messages

This repository follows Conventional Commits.

Format:

```text
<type>(<scope>): <imperative summary>
```

Allowed `type` values:

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`
- `ci`
- `perf`
- `build`

Examples:

- `feat(votes): add get my votes endpoint`
- `feat(i18n): add english and spanish dictionaries`
- `ci(actions): add deploy workflow`

## Pull Requests

- Keep PRs focused and small.
- Ensure `npm run ci` passes before requesting review.
- Use Conventional Commit format for PR title.
- Prefer squash merge using a Conventional Commit title.

## Optional Local Hook

To enforce commitlint locally:

```bash
git config core.hooksPath .githooks
```
