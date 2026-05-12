# Changesets

This folder holds **changesets**: small markdown files describing a change you want included in the next release.

## Adding a changeset

```
pnpm changeset
```

The CLI asks which packages are affected, what bump (`patch` / `minor` / `major`), and a summary line. It writes a `<random-name>.md` file in this folder. Commit it with your PR.

## Releasing

A maintainer runs:

```
pnpm version    # consumes changesets, bumps versions, regenerates CHANGELOGs
pnpm release    # builds and publishes to npm
```

See the [changesets docs](https://github.com/changesets/changesets) for the full lifecycle.
