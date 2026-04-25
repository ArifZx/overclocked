# Agent Guide

Use this file as the canonical project guide for coding agents working in this repository.

## What This Project Is

- Mobile-first Phaser reaction game built with Vite+.
- Core concept and gameplay intent live in [docs/game-design.md](docs/game-design.md).

## Commands

- Install dependencies with `vp install`.
- Start local development with `vp dev`.
- Run format, lint, and type checks with `vp check`.
- Build production output with `vp build`.
- Do not use `npm`, `pnpm`, or `yarn` directly; this repo uses Vite+ wrappers.
- There are currently no test files in the repo. Do not assume `vp test` is a useful validation step unless tests are added.

## Architecture

- [src/main.ts](src/main.ts) boots Phaser with the config from [src/config.ts](src/config.ts).
- [src/core/Constants.ts](src/core/Constants.ts) is the source of truth for machine tuning, UI sizing, and scaling values. Change balance and layout here instead of hardcoding numbers in scenes.
- [src/core/GameState.ts](src/core/GameState.ts) holds the shared runtime state for heat, voltage, pressure, score, motion, and lifecycle flags.
- [src/core/EventBus.ts](src/core/EventBus.ts) defines the cross-system event contract. Reuse the existing event names before inventing new ones.
- [src/systems/MotionSystem.ts](src/systems/MotionSystem.ts) reads device motion and writes into game state. It also provides touch fallback behavior.
- [src/systems/ChaosSystem.ts](src/systems/ChaosSystem.ts) controls timed chaos events and attack windows.
- [src/scenes/Game.ts](src/scenes/Game.ts) is the main gameplay scene and HUD render loop.
- Scene flow is `Boot -> Preloader -> Game -> GameOver` via [src/scenes/Boot.ts](src/scenes/Boot.ts), [src/scenes/Preloader.ts](src/scenes/Preloader.ts), [src/scenes/Game.ts](src/scenes/Game.ts), and [src/scenes/GameOver.ts](src/scenes/GameOver.ts).

## Conventions

- Use named imports from `phaser`. Do not use `import * as Phaser from "phaser"` and do not use `Phaser.` member access.
- Keep game logic close to the owning layer:
  - Scene rendering and UI in `src/scenes/*`
  - Sensor and chaos behavior in `src/systems/*`
  - Shared state and event contracts in `src/core/*`
- Preserve the mobile-first scaling model. If a visual value should scale with the game surface, derive it from the constants in [src/core/Constants.ts](src/core/Constants.ts).
- Keep motion-permission changes aligned with the existing iOS permission flow in [src/systems/MotionSystem.ts](src/systems/MotionSystem.ts) and the entry flow in [src/scenes/Preloader.ts](src/scenes/Preloader.ts). Do not bypass the preload permission gate.
- If you change gameplay rules, cross-check the intended feel against [docs/game-design.md](docs/game-design.md) instead of restating the design doc here.

## Editing Guidance

- For gameplay changes, start from [src/scenes/Game.ts](src/scenes/Game.ts) and then step to the system or state file that actually owns the behavior.
- For balancing or thresholds, edit [src/core/Constants.ts](src/core/Constants.ts) first.
- For event-driven behavior, inspect [src/core/EventBus.ts](src/core/EventBus.ts) before adding new event names.
- For input changes, inspect [src/systems/MotionSystem.ts](src/systems/MotionSystem.ts) and verify touch fallback still works.

## Validation

- Default validation for code changes is `vp check`.
- Use `vp build` when changes may affect bundling, imports, or Phaser build behavior.
- The Vite config in [vite.config.ts](vite.config.ts) includes Phaser aliasing, code-splitting, and staged-file checks. Read it before changing build behavior.
<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
