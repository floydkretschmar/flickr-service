#!/usr/bin/env python3
import json
import re
import shlex
import sys
from collections.abc import Iterable
from pathlib import PurePosixPath
from typing import Any


DANGEROUS_COMMAND_PATTERNS = (
    (re.compile(r"\bgit\s+reset\s+--hard\b"), "hard git resets are blocked"),
    (re.compile(r"\bgit\s+clean\s+-[^\s]*[fdx]"), "destructive git clean is blocked"),
    (
        re.compile(r"\bgit\s+(checkout|restore)\s+[^;\n]*\s--\s"),
        "destructive git checkout/restore is blocked",
    ),
    (
        re.compile(r"\b(curl|wget)\b[^|;\n]*\|\s*(sh|bash|zsh|python3?)\b"),
        "remote download piped to an interpreter is blocked",
    ),
    (re.compile(r"\bdd\b[^;\n]*\bof=/dev/"), "raw device writes are blocked"),
    (re.compile(r"\b(mkfs|shutdown|reboot|poweroff|halt)\b"), "system-level destructive command is blocked"),
    (
        re.compile(r"(^|[;&|]\s*)sudo\b"),
        "sudo commands require explicit human approval outside this hook",
    ),
)

SENSITIVE_PATH_PARTS = {".git", ".ssh"}
SENSITIVE_FILE_NAMES = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519"}


def deny(reason: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": reason,
                }
            },
            separators=(",", ":"),
        )
    )


def load_payload() -> dict[str, Any] | None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def command_from(tool_input: Any) -> str:
    if isinstance(tool_input, dict) and isinstance(tool_input.get("command"), str):
        return tool_input["command"]
    return ""


def is_sensitive_path(path: str) -> bool:
    clean = path.strip().strip("\"'")
    if not clean:
        return False

    parts = PurePosixPath(clean).parts
    name = PurePosixPath(clean).name
    return (
        clean.startswith("/")
        or any(part in SENSITIVE_PATH_PARTS for part in parts)
        or name in SENSITIVE_FILE_NAMES
        or name.endswith((".pem", ".key", ".p12", ".pfx"))
    )


def patch_paths(command: str) -> Iterable[str]:
    for line in command.splitlines():
        match = re.match(r"\*\*\* (Add|Delete|Update) File: (.+)$", line)
        if match:
            yield match.group(2)


def flattened_strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for nested in value.values():
            yield from flattened_strings(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from flattened_strings(nested)


def bash_denial_reason(command: str) -> str | None:
    lowered = command.lower()
    for pattern, reason in DANGEROUS_COMMAND_PATTERNS:
        if pattern.search(lowered):
            return reason

    try:
        tokens = shlex.split(command)
    except ValueError:
        tokens = command.split()

    if tokens and tokens[0] == "rm" and any(
        token.startswith("-") and "r" in token and "f" in token for token in tokens[1:]
    ):
        return "recursive forced deletion is blocked"

    if tokens and tokens[0] in {"rm", "unlink", "rmdir"} and any(
        is_sensitive_path(token) for token in tokens[1:] if not token.startswith("-")
    ):
        return "deleting sensitive or absolute paths is blocked"

    return None


def apply_patch_denial_reason(command: str) -> str | None:
    for path in patch_paths(command):
        if is_sensitive_path(path):
            return f"editing sensitive path is blocked: {path}"
    return None


def mcp_denial_reason(tool_name: str, tool_input: Any) -> str | None:
    destructive_tool = re.search(
        r"(^|__)(delete|remove|rm|rmdir|unlink|write|move|rename)($|_|__)",
        tool_name,
    )
    if destructive_tool and any(is_sensitive_path(value) for value in flattened_strings(tool_input)):
        return "MCP tool targets a sensitive or absolute path"
    return None


def main() -> int:
    payload = load_payload()
    if payload is None:
        deny("Malformed PreToolUse hook input")
        return 0

    if payload.get("hook_event_name") != "PreToolUse":
        return 0

    tool_name = str(payload.get("tool_name", ""))
    tool_input = payload.get("tool_input")
    command = command_from(tool_input)

    reason = None
    if tool_name == "Bash":
        reason = bash_denial_reason(command)
    elif tool_name == "apply_patch":
        reason = apply_patch_denial_reason(command)
    elif tool_name.startswith("mcp__"):
        reason = mcp_denial_reason(tool_name, tool_input)

    if reason:
        deny(reason)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
