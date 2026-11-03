#!/usr/bin/env bash
# Persists job-radar's dedupe state on a dedicated orphan branch so the scheduled GitHub Actions
# job remembers which jobs it already notified about. The branch never mixes with application code.
#
#   state-branch.sh restore   copy state.json from the branch into job-radar/.state/
#   state-branch.sh save      commit job-radar/.state/state.json to the branch (no-op if unchanged)
set -euo pipefail

BRANCH="${JOB_RADAR_STATE_BRANCH:-job-radar-state}"
REMOTE="${JOB_RADAR_REMOTE:-origin}"
ROOT="$(git rev-parse --show-toplevel)"
STATE_FILE="${JOB_RADAR_STATE:-$ROOT/job-radar/.state/state.json}"

remote_has_branch() {
  git ls-remote --exit-code --heads "$REMOTE" "$BRANCH" >/dev/null 2>&1
}

case "${1:-}" in
  restore)
    if remote_has_branch; then
      git fetch --quiet --depth=1 "$REMOTE" "$BRANCH"
      mkdir -p "$(dirname "$STATE_FILE")"
      if git cat-file -e FETCH_HEAD:state.json 2>/dev/null; then
        git show FETCH_HEAD:state.json >"$STATE_FILE"
        echo "Restored state from $REMOTE/$BRANCH"
      else
        echo "Branch $BRANCH has no state.json yet; starting fresh"
      fi
    else
      echo "No $BRANCH branch yet; starting fresh"
    fi
    ;;
  save)
    if [ ! -f "$STATE_FILE" ]; then
      echo "No state file to save"
      exit 0
    fi
    worktree="$(mktemp -d)"
    trap 'git worktree remove --force "$worktree" >/dev/null 2>&1 || true' EXIT
    if remote_has_branch; then
      git fetch --quiet --depth=1 "$REMOTE" "$BRANCH"
      git worktree add --quiet --detach "$worktree" FETCH_HEAD
    else
      git worktree add --quiet --detach "$worktree" HEAD
      git -C "$worktree" checkout --quiet --orphan "$BRANCH"
      git -C "$worktree" rm -rfq . || true
    fi
    cp "$STATE_FILE" "$worktree/state.json"
    git -C "$worktree" add state.json
    if git -C "$worktree" diff --cached --quiet; then
      echo "State unchanged"
    else
      git -C "$worktree" \
        -c user.name="${GIT_AUTHOR_NAME:-github-actions[bot]}" \
        -c user.email="${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}" \
        commit --quiet -m "job-radar: update state $(date -u +%Y-%m-%dT%H:%M:%SZ)"
      git -C "$worktree" push --quiet "$REMOTE" "HEAD:refs/heads/$BRANCH"
      echo "State saved to $REMOTE/$BRANCH"
    fi
    ;;
  *)
    echo "usage: $0 restore|save" >&2
    exit 2
    ;;
esac
