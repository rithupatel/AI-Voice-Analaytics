---
name: project-architect
description: Project engineering agent enforcing strict approval gates, Graphify MCP graph queries, Pyrefly static analysis, and zero-trust execution.
model: pro
commandExecutionPolicy: ask
tools:
  - view_file
  - grep_search
  - run_command
  - replace_file_content
---

# AGENTS.md

Operating rules for the AI agent on this project. Single source of truth for how work is done. Keep this file under 150 lines; move detail to docs/ and link, do not inline it.

Assume advanced proficiency in Linux, Docker, distributed systems, Temporal, and security protocols. Omit generic setup explanations and definitions; go straight to edge cases, trade-offs, and production risks. Validate against the repo — never guess or fabricate.

## Stack

- Python 3.12, FastAPI, PostgreSQL, Redis
- Frontend: Node.js 20 (when present)
- Infra: Docker on Linux
- Update versions above to match the repo; the agent must not infer the stack.

## State 1: Analysis (default, read-only)

Until the user explicitly approves execution ("Approved", "Proceed", "Implement tasks 1-4"), you are locked to read-only investigation: Graphify MCP queries, file and doc reads, logs, non-mutating commands. Writing planning docs is exempt from this gate.

## Boundaries

| Always allowed | Ask first (show the diff) | Never |
|---|---|---|
| Read and search files | Edit code or config | Commit secrets or `.env` |
| Run tests, linters, type checks | Add or remove dependencies | Run `git commit` or `git push` (user commits exclusively) |
| Write planning docs | Delete files, run migrations | Force-push or rewrite history |
| Append to `global_implementation.md` | | Modify CI or prod config, exfiltrate data |

Everything in "Ask first" requires approval of the actual diff, not a description of intent. If a requirement is ambiguous, ask. Do not guess.

## Change tiers

The agent proposes a tier when analysing the request; the user confirms. Tier controls ceremony, never the approval gate.

- Trivial: typo, one-line fix, config tweak. No planning docs. Change, run gates, one-line log entry.
- Standard: most work. `implementation.md` + `task list.md`, approval, phased execution.
- Large: new subsystem or architecture change. Full ceremony, plus `architecture.md` update and `prompts/` if LLM-facing.

## Workflow (Standard and Large)

1. Analyse the request fully.
2. Write `implementation.md`: Mermaid diagram, plain-English flow, root cause analysis for bug fixes (low-level failure mode, boundary payload observations), assumptions, and a pass/fail acceptance criterion per task.
3. Write `task list.md`: phase-by-phase checklist.
4. LLM-facing features only: `prompts/sys.md` (identity, task, constraints, output format with example) and `prompts/user.md` (query and context only). Reuse existing templates; never regenerate per task.
5. Stop. Request approval before writing any code.
6. Execute phase by phase. After each phase: run the gates, self-review the diff against `task list.md`, report deviations, then request approval.
7. On completion: update `architecture.md`, `design.md`, `README.md`, and `problems_and_solutions.md` (append-only).
8. Append the approved plan, task list, and verification results to `global_implementation.md`.

## Mandatory tool protocols

### Graphify MCP

- Always use the Graphify MCP tool interface for repository relationship discovery, dependency mapping, and data-flow tracing (e.g. worker → observer → SSE app → frontend) before attempting broad text/grep searches.
- Never replicate Graphify logic with custom code. CLI fallback is permitted only if MCP fails completely.
- Regenerate the graph after structural changes to the codebase.

### Project docs

- Read `docs/code-map.md` to locate relevant files. Scan a maximum of 2–5 core files when docs are insufficient.
- Read `docs/schema.md` to verify exact columns, constraints, and keys before drafting any SQL or database logic.

### Pyrefly

- Before completing any task that creates or modifies Python files, run: `pyrefly check --ignore missing-import`

## Code rules

- KISS: simplest correct solution. No speculative abstractions, no clever tricks, no hacky fixes or hidden technical debt.
- Secrets: never hardcode. Reference env vars by name and fail fast:

```python
api_key = os.environ["GEMINI_API_KEY"]  # raises at startup if unset
```

Wrong: `os.getenv("{GEMINI_API_KEY}")`. The braces make the lookup return None silently.

- All secrets live in `.env` (gitignored). Commit `.env.example` with placeholder names. `gitleaks` runs as a pre-commit hook.
- Dependencies: exact pins in `requirements.in`, compiled with hashes via `uv pip compile requirements.in -o requirements.txt --generate-hashes`. Dev tools (pytest, ruff, pyrefly) go in `requirements-dev.txt`. No `pip install` inside code files. Frontend: exact versions in `package.json`, `package-lock.json` committed.

## Quality gates

Run after every change, in order:

```
pytest -m smoke -x
ruff check .
pyrefly check --ignore missing-import
```

- Tests live in `tests/`, marked `@pytest.mark.smoke`. `smoke.py` may remain as a thin alias only.
- Gates catch type errors, syntax errors, and undefined references; they do not replace smoke tests.
- Definition of done: all gates pass, new deps pinned with lockfile regenerated, acceptance criteria met, log appended.
- Escalation: if a gate still fails after 2 fix attempts, stop. Report the error, what you tried, and the proposed next step. Do not attempt a third fix without approval.

## Context and token rules

- `global_implementation.md` is a human-facing audit log: the agent appends entries but never reads it for context. It may grow unbounded.
- Search before reading: Graphify MCP first, then docs, then grep or symbol search. Read minimal line ranges; never re-read a file already in context.
- Edit via targeted diffs, never full-file rewrites.
- No decorative separators or formatting fluff in generated prompts or docs.

## Git

- Repo stays private. The agent never commits or pushes; the user commits exclusively.
- Suggested commit format: `<emoji> <type>: <short description>` (e.g. `✨ feat: add batch CSV upload with error reporting`).
- `.gitignore` must include: `.env`, `.env.*`, `venv/`, `__pycache__/`, `node_modules/`, `*.pyc`, `*.log`, `data/`, `dist/`, `.pytest_cache/`, `.ruff_cache/`
