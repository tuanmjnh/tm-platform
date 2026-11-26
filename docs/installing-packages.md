# Installing the shared packages

The `@tuanmjnh/*` packages reach the apps two ways, and they are not
interchangeable. Pick per app; both are supported.

| Way | What the manifest says | When it updates |
|---|---|---|
| **npm registry** | `"^0.4.2"` | `pnpm update` picks up whatever was published |
| **GitHub, pinned commit** | `git+https://github.com/tuanmjnh/tm-platform.git#<sha>&path:/packages/tm-core` | Only when you change the SHA |
| **GitHub, branch** | `...#main&path:/packages/tm-core` | `pnpm update <pkg>` re-resolves `main` |

The repositories currently use the **pinned commit** form. This document
explains why, and how to move between the three.

## Why `dist/` is committed

pnpm packs a git dependency with no build step, so a package installed from
GitHub can only work if its compiled output is in the tree. `dist/` is therefore
committed rather than ignored.

That choice is not cosmetic. Without a committed `dist/`, pnpm falls back to a
`prepare` script, and a package that also declares a `publish` script gets
**that** one run instead — which calls `npm publish` during install and fails
with `You cannot publish over the previously published versions`.

`node scripts/bump.mjs` rebuilds `dist/` whenever a version changes, so the
committed output always matches the version it is labelled with.

## Pinned commit (current)

```json
"@tuanmjnh/tm-ui": "git+https://github.com/tuanmjnh/tm-platform.git#3e94773&path:/packages/tm-ui"
```

`node scripts/pin-apps.mjs` writes these for every app and prints the exact
`pnpm add` commands. It warns when the target commit is not on `origin/main`,
because a pin to an unpushed commit cannot be installed anywhere else.

Update procedure:

```bash
node scripts/bump.mjs            # bump + rebuild dist for changed packages
git add -A && git commit
git push                         # the SHA must exist on origin
node scripts/pin-apps.mjs        # prints one `pnpm add` line per app
# run those commands, then commit each app's package.json + lockfile
```

## Branch (`#main`)

Works, but `pnpm install` does **not** refresh it. The lockfile freezes `main`
to the commit that was current when the dependency was added, and keeps using
that commit forever — `pnpm install`, `pnpm install --force` and a bare
`pnpm update` all leave it alone.

The refresh command is `pnpm update <pkg>`:

```bash
pnpm update "@tuanmjnh/tm-ui"     # re-resolves main for that package
pnpm update "@tuanmjnh/*"         # every shared package at once
```

Trade-offs, measured on a test repository:

| | Pinned SHA | `#main` |
|---|---|---|
| Updates on `pnpm install` | no | no |
| Updates on `pnpm update <pkg>` | no (SHA is fixed) | **yes** |
| Reproducible build later | yes | no — main moves |
| Tells you which code is running | yes, from the manifest | no, only the lockfile knows |
| Ships an unbuilt commit by accident | no, you choose the commit | possible |

A pinned commit is the default because the failure mode of `#main` is silent:
somebody pushes a source change without running `bump.mjs`, you run
`pnpm update`, and you get dist from the previous build under the new code.

## Back to npm

The packages are still published to npm; nothing about the GitHub path removes
that. To move an app back to the registry:

```bash
pnpm remove @tuanmjnh/tm-ui && pnpm add @tuanmjnh/tm-ui@^0.2.1
```

Check what is actually published before pinning a range:

```bash
node scripts/release.mjs list     # version / dist / registry state per package
```

## Verifying an app after switching

```bash
pnpm install
node -p "require('@tuanmjnh/tm-core/package.json').version"   # the installed version
pnpm typecheck
```

The version printed must match the one in the manifest; a mismatch means pnpm
served a cached copy of an older commit.
