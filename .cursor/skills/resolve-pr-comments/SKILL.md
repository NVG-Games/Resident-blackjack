---
name: resolve-pr-comments
description: Читает все неразрешённые комментарии текущего PR через gh CLI и применяет правки в коде. Используй когда просят посмотреть/исправить/resolve комментарии пиара, PR review comments, замечания ревьюеров.
disable-model-invocation: false
---

# Resolve PR Comments

## Шаги выполнения

### 1. Найти репозиторий

Найди папку проекта с git remote (может быть в подпапке воркспейса):

```bash
git remote -v
git branch --show-current
```

Определи `<owner>/<repo>` из remote URL.

### 2. Найти открытый PR для текущей ветки

```bash
gh pr list --repo <owner>/<repo>
```

### 3. Получить ВСЕ комментарии PR

Выполни все три запроса:

```bash
# Inline review comments (привязаны к строкам кода)
gh api repos/<owner>/<repo>/pulls/<PR_NUMBER>/comments \
  --jq '.[] | {id: .id, user: .user.login, body: .body, path: .path, line: .line}'

# Review-уровневые комментарии
gh api repos/<owner>/<repo>/pulls/<PR_NUMBER>/reviews \
  --jq '.[] | {id: .id, user: .user.login, state: .state, body: .body}'

# Общие issue-комментарии к PR
gh api repos/<owner>/<repo>/issues/<PR_NUMBER>/comments \
  --jq '.[] | {id: .id, user: .user.login, body: .body}'
```

### 4. Классифицировать комментарии

| Тип | Действие |
|-----|----------|
| `⚠️ Potential issue` от coderabbitai | **Исправить** |
| `🛠️ Refactor suggestion` от coderabbitai | **Исправить** |
| `Changes requested` от живого reviewer | **Исправить** |
| `📝 Info` от devin-ai | Только информация, **не трогать, но проанализировать по ситуации** |
| Автоматические summary/walkthrough от coderabbitai | **Игнорировать** |
| CI/CD боты (github-actions) | **Игнорировать** |

### 5. Применить правки

- Перед правкой всегда читать текущий код файла (`Read` tool)
- Проверять, не исправлено ли уже замечание в текущем коде
- После всех правок проверить линтер (`ReadLints`)
- **Никогда не делать git commit и push без явного разрешения пользователя**

### 6. Закрыть (resolve) исправленные треды

После применения всех правок — закрыть соответствующие review threads через GraphQL API.

**Шаг 6.1** — получить thread IDs всех открытых тредов:

```bash
gh api graphql -f query='
{
  repository(owner: "<owner>", name: "<repo>") {
    pullRequest(number: <PR_NUMBER>) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              databaseId
              author { login }
              body
            }
          }
        }
      }
    }
  }
}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id: .id, user: .comments.nodes[0].author.login, body: .comments.nodes[0].body[0:120]}'
```

**Шаг 6.2** — резолвить каждый тред который был исправлен (или является Info/игнорируемым):

```bash
gh api graphql -f query="mutation { resolveReviewThread(input: {threadId: \"<THREAD_ID>\"}) { thread { id isResolved } } }"
```

Резолвить нужно **все** незакрытые треды:
- Исправленные — потому что фикс применён
- `📝 Info` от devin-ai — информационные, action не требуется
- Любые другие игнорируемые — чтобы PR был чистым

### 7. Отчитаться

Показать список что было исправлено, что проигнорировано и почему, и подтвердить что все треды закрыты.
