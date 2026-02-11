# AI Agent Git Behavior - Quick Reference

**Project**: Web Application  
**Root**: Project root directory  
**Hooks**: Enabled (NEVER use `--no-verify` - fix issues instead)

## Commit Format

```
<type>(<scope>): <subject>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

**Common Scopes**: `auth`, `item`, `detail`, `task`, `ui`, `api`, `db`, `docker`

**Subject Rules**:

- Imperative mood ("add" not "added")
- Lowercase start
- No period
- Max 72 chars
- Specific and clear

## Scope Mapping (File Path → Scope)

### Backend

```
backend/src/controllers/auth.*                    → (auth)
backend/src/services/auth.*                       → (auth)
backend/src/routes/auth.*                         → (auth)
backend/src/middleware/auth.*                     → (auth)

backend/src/controllers/item.*                    → (item)
backend/src/services/item.*                       → (item)
backend/src/routes/item.*                         → (item)

backend/src/controllers/detail.*                  → (detail)
backend/src/services/detail.*                     → (detail)
backend/src/routes/detail.*                       → (detail)

backend/src/controllers/task.*                    → (task)
backend/src/services/task.*                       → (task)
backend/src/routes/task.*                         → (task)

backend/src/controllers/event.*                   → (event)
backend/src/services/event.*                      → (event)
backend/src/routes/event.*                        → (event)

backend/src/controllers/upload.*                  → (upload)
backend/src/routes/upload.*                       → (upload)
backend/src/config/upload.*                       → (upload)

backend/src/middleware/errorHandler.*             → (middleware)
backend/src/middleware/validate.*                 → (middleware)

backend/src/config/logger.*                       → (config)
backend/src/config/prisma.*                       → (config)
backend/src/config/redis.*                        → (config)
backend/src/config/swagger.*                      → (config)
backend/src/config/index.*                        → (config)

backend/prisma/schema.prisma                      → (db)
backend/prisma/migrations/*                       → (db)
backend/prisma/seed.ts                            → (db)
backend/prisma/reset.ts                           → (db)

backend/src/validators/*                          → (validation)
backend/src/utils/*                               → (utils)
backend/src/types/*                               → (types)
```

### Frontend

```
frontend/src/pages/auth/*                         → (auth)
frontend/src/components/auth/*                    → (auth)
frontend/src/services/auth.*                      → (auth)

frontend/src/pages/admin/*                        → (admin)
frontend/src/components/admin/*                   → (admin)

frontend/src/pages/user/*                         → (user)
frontend/src/components/user/*                    → (user)

frontend/src/components/item/*                    → (item)
frontend/src/pages/shared/item/*                  → (item)

frontend/src/components/form/*                    → (ui)
frontend/src/components/common/*                  → (ui)
frontend/src/components/layout/*                  → (ui)

frontend/src/services/item.*                      → (item)
frontend/src/services/task.*                      → (task)
frontend/src/services/detail.*                    → (detail)

frontend/src/contexts/*                           → (context)
frontend/src/hooks/*                              → (hooks)
frontend/src/utils/*                              → (utils)
frontend/src/types/*                              → (types)
```

### Infrastructure

```
docker-compose.yml                                → (docker)
Dockerfile, Dockerfile.dev                        → (docker)
deployment/*                                      → (deploy)
dev/*                                             → (dev)

backend/package.json (dependencies)               → (deps) with type: chore
frontend/package.json (dependencies)              → (deps) with type: chore
package.json (root, if exists)                    → (deps) with type: chore

backend/test/*, backend/test/api/*                → (test)
frontend/test/*                                   → (test)

docs/*.md                                         → (docs)
*.md (root level: README, etc.)                   → (docs)
```

## Quick Decision Matrix

| Change Type       | Type            | Example                                  |
| ----------------- | --------------- | ---------------------------------------- |
| New functionality | `feat`          | `feat(item): add image upload support`   |
| Bug fix           | `fix`           | `fix(task): resolve status sync issue`   |
| Docs only         | `docs`          | `docs(api): add endpoint examples`       |
| Refactor          | `refactor`      | `refactor(auth): extract validation logic` |
| Tests             | `test`          | `test(item): add integration tests`      |
| Dependencies      | `chore`         | `chore(deps): update prisma to v5.7.1`   |
| DB schema         | `feat` or `fix` | `feat(db): add order field to details`   |

## Commit Workflow

```bash
# 1. Check changes
git status

# 2. Determine type + scope from changed files

# 3. Write commit message
git add -A
git commit -m "type(scope): specific action and reason"

# 4. If hooks fail: ALWAYS fix the issues and retry
npm run lint --fix
npm run type-check
git add .
git commit -m "type(scope): specific action and reason"
```

## Multi-File Changes

**Same feature** → Single commit with bullet list in body:

```bash
feat(item): add image upload support

- Add imageUrl field to schema
- Create upload controller
- Add frontend component
- Add tests
```

**Multiple features** → Separate commits (one per feature)

**Schema change** → Always include migration details:

```bash
feat(db): add order field to details

- Create migration 20251121051734_add_order_to_details
- Backfill existing data
- Update queries to use new field
```

## Common Patterns

```bash
# Bug fix
fix(task): prevent status update after completion

# New feature
feat(item): add JSON import validation

# Refactor
refactor(service): extract validation logic

# Docs
docs(api): add item endpoint examples

# Dependencies
chore(deps): update dependencies

# Database
feat(db): add imageUrl to questions schema

# Tests
test(auth): add JWT refresh tests
```

## Pre-commit Hook Handling

**NEVER use `--no-verify`**

If hooks fail:

1. Run `npm run lint --fix` in affected directory (backend/ or frontend/)
2. Run `npm run type-check` to verify TypeScript
3. Fix any remaining issues manually
4. Stage fixes and retry commit

Pre-commit hooks ensure code quality. Bypassing them is not allowed.

## Critical Rules

1. **Format**: Always `type(scope): subject`
2. **Specificity**: Be specific ("add order field" not "update db")
3. **Tense**: Imperative ("add" not "added")
4. **Scope**: Based on primary changed files
5. **Body**: Use for complex/multi-file changes
6. **Hooks**: NEVER bypass - always fix issues

## Examples from Project

✅ **Good**:

```bash
fix(question): add explicit order field to prevent ordering issues
feat(exam): add JSON import with validation
docs(api): add examples for session endpoints
chore(deps): update prisma to v5.7.1
```

❌ **Bad**:

```bash
fix: bug fix                    # Too vague
fixed: timer issue              # Wrong tense
feat: add stuff                 # Not specific
update questions                # Missing type and scope
```
