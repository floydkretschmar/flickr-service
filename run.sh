#!/usr/bin/env sh
set -eu

rtk_hook() {
  export RTK_CODEX_HOOK_MODE=deny
  export RTK_BIN="$(which rtk)"
  export NO_RTK_BIN="$(which NO_RTK)"
  python3 "$(git rev-parse --show-toplevel)/.codex/hooks/rtk_hook.py"
}

safety_hook() {
  python3 "$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py"
}

setup_environment() {
  if command -v rtk >/dev/null 2>&1; then
    echo "rtk already available"
  else
    curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/v0.42.4/install.sh | sh
  fi

  if command -v context-mode >/dev/null 2>&1; then
    echo "context-mode already available"
  else
    npm install -g context-mode@1.0.162
  fi
}

case "${1:-}" in
  test)
    npm run verify:policy
    npm run coverage
    ;;
  format)
    npm run format
    ;;
  build)
    npm run build
    ;;
  rtk-hook)
    rtk_hook
    ;;
  safety-hook)
    safety_hook
    ;;
  setup-environment)
    setup_environment
    ;;
  *)
    echo "Usage: $0 {test|format|build}" >&2
    exit 2
    ;;
esac
