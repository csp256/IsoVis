# Optional Chrome benchmark

This is an on-demand browser harness, not an app dependency or a CI job. No
bundler, npm package, or build step is involved. Serve the repository over local
HTTP with any static server; with Bun, from the root:

```sh
bun bench/serve.cjs
```

Open http://127.0.0.1:8080/bench/index.html in Chrome. Fill the revision label and
hardware description, then click Run. Use one tab, close DevTools, keep the tab
foregrounded, and avoid concurrent CPU-intensive work. The iframe is a dedicated
throwaway application instance. Cancellation stops after the current small trial;
no high-resolution workload runs automatically. Default cases are the startup
field and a sphere, resolutions 8/16, normals off/on, one warmup and five samples.

JSON records browser/hardware hints, GPU identity when exposed, viewport, workers,
settings, and min/p50/p95/max distributions. Metrics:

- **round_trip_ms**: dispatch through the last worker reply and its UI handling.
  Includes scheduling, transfer and CPU geometry installation, not pure worker time.
- **reply_handling_ms**: summed main-thread reply-handler time; not pure transfer time.
- **two_animation_frames_ms**: two rAF callbacks after completion, not GPU completion.
- **frame_gap_ms**: observed parent-page rAF gaps during measured trials; an approximate
  responsiveness signal, not a guaranteed complete record of iframe/render stalls.
- **observed_heap_bytes**: optional Chromium `performance.memory` samples every 25ms.
  Coarse and not a guaranteed peak; may include parent/iframe overhead. Unavailable
  APIs produce null, not a fabricated zero. Renderer resource counters are separate.

For comparison, run the same harness/browser/hardware/settings on two revisions,
copying the `bench/` directory into an older checkout if necessary. Keep labels
and raw JSON. Use more samples for meaningful distributions; five trials are a
quick smoke comparison, not statistical proof. Test repeated runs for resource
trends. Legacy copied-position normals are incorrect: faster legacy results do
not establish a regression for equivalent correct output. Do not infer GPU speed
or cross-browser compatibility from this harness. Do not change the hand-tuned
marching-cubes traversal without representative measurements.
