This is a Node 22/TypeScript Express API that exposes `GET /photos/:albumId` for paginated Flickr photoset data. It fetches album photos from Flickr, maps them into the site's public photo DTOs with formatted dates, thumbnails, view counts, and bucket-backed full-resolution image URLs, then runs behind CORS and rate limiting for Fly.io deployment.

Skills are located in `.codex/skills/*/SKILL.md`
General project information can be fetched from `docs/PROJECT.md`
Testing principles are located in `docs/TESTING.md`
Execution principles (relevant when changing production code) are located in `docs/EXECUTION.md`
Programming language specific rules are located in `docs/languages/*.md`

Follow this skill chain for new feature requests. If the user requires a bugfix or explicitly states otherwise, this may be skipped:
```
/plan-feature OR /rearchitect ──> /scheme ──> /execute ──> /review ──> /finish                                                                                                                                                                                    
```
ALWAY USE PROPPER CUSTOM AGENTS FOR THE TASK. Never default to a standard subagent if a custom agent profile is available:
- For web research, use the `web_researcher` agent.
- For code analysis, use the `codebase_researcher` agent.
- For manual testing and qa use the `qa_engineer` agent.
- For evaluating spec compliance and evaluating business feasability, use the `business_analyst` agent.
- For refactoring, architectural decisions and coming up with integration strategies, use the `software_architect` agent.
- For code quality review use the `review_developer` agent.
- For UI/UX heavy task that are user facing, use the `frontend_developer` agent.
- For backend/server heavy task mainly involving system to system interaction, use the `backend_developer` agent.

NEVER duplicate work of a subagent. If a subagent is already working on a task, wait for completion and report before continuing.

# Shell usage
Always prefix shell commands with `rtk`.

Examples:
```bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
```

# Operating Principles (Non-Negotiable)
- **Less is better**: Reducing lines of code instead of adding them is a virtue.
- **Remove is better than add**: NEVER add if you can modify or delete instead. LESS code is an indicator for BETTER quality.
- **Security changes need explicit approval**: If a task touches authentication, credentials, production config, or secret material, stop and explicitly confirm scope with the user before proceeding.
- **Smallest change that works**: Minimize blast radius; don't refactor adjacent code unless necessary.
- **Correctness over cleverness**: Prefer boring, readable solutions that are easy to maintain.
- **Leverage existing patterns**: Follow established project conventions before introducing new abstractions.
- **Prove it works**: "Seems right" is not done. Validate with tests/build/lint.
- **Be explicit about uncertainty**: If you cannot verify something, say so.
- **No Laziness**: Find root causes. No temporary fixes. Production quality code.
- **Subagent Strategy**: Use subagents liberally to keep main context window clean. Outsource research, exploration, and parallel analysis to subagents. One task per subagent for focused execution
- **Refactor after green**: The refactor step of TDD is mandatory after behavior is green.

# Forbidden Actions
- **Never push, or create PRs without explicit user approval**
- **Never execute resets or rollbacks without explicit user approval**
- **Never expose secrets from logs, environment dumps, CI output, screenshots, or terminal transcripts.**
- Never commit secrets or credentials
- Never force push to main/master
- Never make changes outside the scheme without discussion
- Never mark done without FULL verification evidence is green:
    - `./run.sh test`
    - `./run.sh format`
    - `./run.sh build`
