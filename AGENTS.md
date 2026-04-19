# Agent instructions for ProAvalon

- Always commit (and push) changes when you reach a natural endpoint, unless there is no git repo.
- Keep `./docs/` updated as you investigate and change things.

## VPS / build safety

This is a cheap VPS with limited RAM and slow disk. Concurrent Node/npm builds can cause swap thrashing and system hangs. Treat build concurrency as forbidden by default.

Before running any build-related command (`npm`, `pnpm`, `yarn`, `node`, `tsc`, `webpack`, `vite`, `next build`, etc.):

1. Check for already-running **build** processes.
2. Check load average, RAM, swap, disk space, and disk pressure.
3. Briefly report the preflight result before starting the build.

### Important clarification

- Do **not** wait for the machine to hit `0.00` load. That is not the goal.
- Long-lived app/server processes do **not** count as active builds by themselves.
- Only block on another process when it is clearly a concurrent build/dev-bundling task such as:
  - `npm run build`
  - `pnpm build`
  - `yarn build`
  - `tsc`
  - `webpack`
  - `vite build`
  - `next build`

### Healthy-to-build thresholds for this VPS

Treat the machine as healthy enough to start **one** build only when all of the following are true:

- No other active build/bundling process is already running.
- Load average is not elevated for a 2-vCPU box:
  - 1-minute load `<= 1.5`
  - 5-minute load `<= 1.5`
- `MemAvailable >= 600 MiB`
- Swap use is not excessive:
  - `SwapUsed <= 1.0 GiB`
  - and not obviously climbing fast between checks
- Root filesystem has breathing room:
  - at least `3 GiB` free
  - and disk usage `< 95%`
- Pressure is calm:
  - `/proc/pressure/io` full `avg10 <= 1.0`
  - `/proc/pressure/memory` full `avg10 <= 1.0`

### If unhealthy

- If another build is running, or if the thresholds above are not met, do **not** start the build.
- Wait 10 minutes, then check again.
- If repeated checks still fail, stop and report which threshold(s) are blocking the build instead of forcing it.

### Concurrency rule

- Never run multiple builds at the same time unless explicitly authorized.
- Prefer low-concurrency or single-worker modes whenever possible.
