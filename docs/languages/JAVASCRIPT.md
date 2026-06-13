## Coding conventions
- Use ES modules with proper import sorting and extensions
- Prefer `function` keyword over arrow functions
- Use explicit return type annotations for top-level functions
- Follow proper React component patterns with explicit Props types
- Prefer async/await over promise chaining for better readability

## React Hooks

- Decompose large hooks into smaller focused hooks that each own one cohesive behavior or derived state concern.
- Keep hook exports production-used and behavior-oriented; do not create hook boundaries solely for tests.