# Approved cartoon Money Journey

Ralph approved the cartoon mockup with these names and symbols:

| Level | Name | Artwork |
| --- | --- | --- |
| 1 | Money Rookie | Green seedling growing from a gold coin, white badge |
| 2 | Money Builder | Three ascending gold coin stacks, emerald badge |
| 3 | Money Strategist | Blue rocket |
| 4 | Money Master | Gold trophy and three stars |

The four badge images are extracted directly from the approved mockup (`exec-c2b17bec-b060-45bc-ac73-5342ec3353a2.png`). Each circular badge is normalized to the same visible size, with transparent corners and a 512px lossless WebP canvas. No new artwork was generated during implementation. The current-level header reuses the same asset as its journey stage.

Progress remains brand green at every level. A champagne/gold percentage badge retains the approved accent. Full level names appear under the four badges. Existing desktop width and responsive icon sizing are preserved. Progress thresholds, achievements, collapse persistence, celebration logic and saved-budget schema are unchanged.

Unit coverage executes the actual renderer for all 12 level/status combinations and fingerprints all four approved asset files. Browser coverage checks 320px, 375px, 390px, 768px and 1440px, correct names/assets/colors, equal badge sizes, desktop alignment, connector position, saved data, collapse persistence and offline reload. CI publishes screenshots for visual review. Native Safari/iOS rendering is not covered by the Chromium checks.

PWA cache v48 includes the cartoon badges and updated styles.
