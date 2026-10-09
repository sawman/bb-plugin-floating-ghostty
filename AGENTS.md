# Floating Ghostty maintenance

This is the `sawman/bb-plugin-floating-ghostty` compatibility fork of
`adiutama/bb-plugin-floating-ghostty`, not Work Sidebar. Preserve MIT attribution,
third-party notices, exact worktree ownership and persistent BB-managed terminals.

For authorized remote Git, use the `sawman` GitHub identity and restore `matthew-se`
afterward. Do not change account identity for local edits or tests. Deployment and
remote operations belong to the coordinating root when work is delegated.

On a BB upgrade, verify live BB/SDK versions, run `bb plugin types`, audit changed
SDK contracts and private DOM adapters, update the lockfile and honest engine
ranges, then run tests, no-emit typecheck, `bb plugin types --check` and production
build. Also check a clean `--omit=dev --omit=optional --ignore-scripts` build and
WASM/font availability. Run live smoke only against the installed reviewed version;
never close terminals the smoke did not create. Keep task-local audit notes under
`.agents/memory/tasks/<task-id>/`; track tasks in BB, not this file.
