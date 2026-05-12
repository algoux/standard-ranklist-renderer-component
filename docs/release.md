# Release Operations

This repository publishes standalone framework packages from `packages/*`. The root package is private and is not published.

## Published Packages

- `@algoux/standard-ranklist-renderer-component-core`
- `@algoux/standard-ranklist-renderer-component-styles`
- `@algoux/standard-ranklist-renderer-component-react`
- `@algoux/standard-ranklist-renderer-component-vue`
- `@algoux/standard-ranklist-renderer-component-solid`
- `@algoux/standard-ranklist-renderer-component-svelte`
- `@algoux/standard-ranklist-renderer-component-angular`

## Automation Model

GitHub Actions owns versioning and publishing after changes land on `master`.

1. A normal change includes code, docs, tests, and one or more pending `.changeset/*.md` files.
2. CI verifies pull requests with `release:audit` and `test:release`.
3. When changesets reach `master`, the release workflow verifies the release plan and opens or updates a version PR.
4. The version PR contains package version bumps, package changelogs, internal dependency updates, and consumed changeset removals.
5. Merging the version PR publishes the bumped packages to npm.
6. After publish, the release workflow creates a repository-level semver tag for the next `release:audit` baseline.

The repository-level semver tag is an audit baseline. In partial releases, it may not exactly match every published package version.

## Manual Local Steps

Create a changeset for every user-visible or package-published change:

```bash
pnpm -w run changeset
```

Use `patch` for fixes and packaging-only corrections, `minor` for backward-compatible features, and `major` only for intentional breaking API or behavior changes.

Before committing, inspect the release plan:

```bash
pnpm -w run release:audit
pnpm -w run changeset:status
```

Commit the generated `.changeset/*.md` file with the code change it describes:

```bash
git add .
git commit -m "<change summary>"
git push
```

The random changeset filename is intentional and should not be renamed for readability unless you want to.

When shared packages such as `core` or `styles` change, decide whether framework packages that depend on them should also be included. `release:audit` can identify changed package directories, but semantic release scope still needs human judgment.
