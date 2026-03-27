# Ralph Loop Skill

Execute a large, repetitive refactoring task using the Ralph pattern:
- Each iteration processes ONE unit of work (one file, one function, one pattern)
- A fresh agent context is used per iteration — no context accumulation
- The loop stops only when an external verification command returns 0, never when the LLM says "done"

## When to use

Use this skill when:
- The task affects many files (5+) with a clear, repeatable pattern
- There is an objective "done" criterion expressible as a shell command
- The work is mechanical (find X, replace with Y) rather than creative

Do NOT use for:
- Architectural decisions or design choices
- Tasks without a clear pass/fail verification
- Single-file changes

## Phase 1: Plan the task

Before generating any script, analyze the task and produce:

### 1. Discovery command

A shell command that lists all items still needing work:

```bash
# Examples:
grep -rl "Optional\[" ./src/          # files with forbidden typing
grep -rl 'placeholder="[A-Z]' ./components/  # hardcoded placeholders
ruff check --select D ./src/ 2>&1 | grep "error:" | wc -l
```

### 2. Verification command

A shell command that returns `0` (exit code or count) when the task is fully complete.
This is the ONLY thing that decides when the loop stops — never trust the LLM's "done":

```bash
# Count-based (loop stops when output == "0"):
grep -r "Optional\[" ./src/ | wc -l

# Exit-code-based (loop stops when exit code == 0):
mypy ./src/ --ignore-missing-imports
npx tsc --noEmit
```

Choose `VERIFICATION_MODE=count` when your done-criterion is "zero occurrences remain"
and `VERIFICATION_MODE=exit` when it is "a tool exits cleanly". The script template
below supports both modes.

### 3. Single-unit prompt

A prompt for one fresh agent iteration that:
- Finds ONE item to process (using the discovery command + `| head -1`)
- Applies the transformation to that ONE item only
- Stops after ONE item — does not try to do everything at once

Example prompt template:
```text
Fix ONE file.
Find it: grep -rl "Optional\[" ./src/ | head -1
Read the file, replace all `Optional[X]` with `X | None`.
Do NOT touch any other files. Stop after this one file.
```

## Phase 2: Generate the bash script

Generate a script named `ralph_<task_slug>.sh` in the project root.

```bash
#!/bin/bash
# Ralph loop: <task description>
# Stops when: <verification command> returns 0

MAX_ITERATIONS=100
ITERATION=0

# VERIFICATION_MODE=count  → done when discovery command outputs "0"
# VERIFICATION_MODE=exit   → done when verification command exits 0
VERIFICATION_MODE=count   # change to "exit" for tool-based verification

PROMPT='<single-unit prompt here>'

is_done() {
    if [ "$VERIFICATION_MODE" = "exit" ]; then
        # Exit-code-based: e.g. mypy or npx tsc --noEmit
        <verification command>
        return $?
    else
        # Count-based: done when zero occurrences remain
        REMAINING=$(<discovery command>)
        if ! [[ "$REMAINING" =~ ^[0-9]+$ ]]; then
            echo "ERROR: discovery command returned non-numeric output: '$REMAINING'" >&2
            return 1
        fi
        echo "=== Iteration $ITERATION: $REMAINING items remaining ==="
        [ "$REMAINING" -eq 0 ]
        return $?
    fi
}

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    if [ "$VERIFICATION_MODE" = "count" ]; then
        REMAINING=$(<discovery command>)
        if ! [[ "$REMAINING" =~ ^[0-9]+$ ]]; then
            echo "ERROR: discovery command returned non-numeric output: '$REMAINING'" >&2
            exit 1
        fi
        echo "=== Iteration $ITERATION: $REMAINING items remaining ==="
    else
        echo "=== Iteration $ITERATION ==="
    fi

    if is_done; then
        echo "SUCCESS: Verification passed. Done!"
        exit 0
    fi

    # Spawn fresh agent for ONE item
    cursor agent -p "$PROMPT"
    AGENT_EXIT=$?
    if [ $AGENT_EXIT -ne 0 ]; then
        echo "ERROR: cursor agent failed on iteration $ITERATION (exit $AGENT_EXIT)."
        echo "  PROMPT: $PROMPT"
        if [ "$VERIFICATION_MODE" = "count" ]; then
            echo "  Remaining: $REMAINING"
        fi
        exit $AGENT_EXIT
    fi

    ITERATION=$((ITERATION + 1))
done

echo "WARNING: Reached max iterations ($MAX_ITERATIONS). Check remaining items."
exit 1
```

## Phase 3: Run the script

1. Make it executable: `chmod +x ralph_<task_slug>.sh`
2. Run it: `./ralph_<task_slug>.sh`
3. Monitor output — each iteration shows remaining count
4. The script exits 0 on success, 1 if max iterations reached

## Rules

- NEVER let the loop stop because the agent said "I'm done" — only external verification counts
- Each agent call must process exactly ONE unit (one file, one occurrence)
- The single-unit prompt must be self-contained — the fresh agent has no prior context
- Always include a `MAX_ITERATIONS` safety limit
- Delete the script after the task is complete (it's a one-off tool)

## Ready-made examples

See `EXAMPLES.md` in this directory for copy-paste-ready tasks for this project.
