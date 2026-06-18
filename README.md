# git-branch-list

An interactive terminal UI for browsing, switching, refreshing, and deleting Git branches.

This branch is the OpenTUI rewrite of the app. It uses Bun, React, OpenTUI, and Effect to provide a keyboard-driven branch picker that runs directly in your terminal.

## Requirements

- [Bun](https://bun.sh/)
- Git

## Install dependencies

```bash
bun install
```

## Run locally

From inside a Git repository:

```bash
bun start
```

For development with watch mode:

```bash
bun dev
```

## Install as a local CLI

The package exposes a `git-branch-list` binary through `package.json`.

For local development, link it globally with Bun:

```bash
bun link
```

Then run it from any Git repository:

```bash
git-branch-list
```

You can also install the current checkout globally:

```bash
bun install -g .
```

## Controls

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move selection |
| `j` / `k` | Move selection |
| `enter` | Switch to selected branch |
| `d` | Prompt to delete selected branch |
| `y` | Confirm branch deletion |
| `n` / `esc` | Cancel branch deletion |
| `r` | Refresh branch list |
| `q` | Quit |

The current branch is marked with `*`. Deleting the current branch is rejected by the app.

## Check types

```bash
bun run check
```

## Tech stack

- [Bun](https://bun.sh/) runtime
- [OpenTUI](https://github.com/sst/opentui) terminal UI
- React renderer for OpenTUI
- [Effect](https://effect.website/) for Git command execution and error handling
