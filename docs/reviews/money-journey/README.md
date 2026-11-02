# Approved glossy Money Journey artwork

Ralph approved all four newly generated glossy badge images and authorized publishing them to the app. The app now uses those approved images, resized with transparency preserved to 512px lossless WebP assets. The old vector approximations are removed from the primary badge renderer.

| Level | Artwork | Asset |
| --- | --- | --- |
| Money Starter | Glossy green check | `icons/money-starter-glossy.webp` |
| Money Builder | Glossy teal bars | `icons/money-builder-glossy.webp` |
| Money Momentum | Glossy blue rocket | `icons/money-momentum-glossy.webp` |
| Money Master | Glossy gold trophy and three stars | `icons/money-master-glossy.webp` |

Level identity always selects the image; completion never substitutes a checkmark. Existing progression, collapse behavior, celebration logic, Today financial information and navigation are preserved. PWA cache v46 includes all four assets and updated styles.

Tests execute the actual production renderer across all 12 level/status combinations and fingerprint the actual approved asset bytes. Browser checks cover every reachable current level at 375px, 390px and 1440px, image decoding and layout fit, collapse persistence, saved-budget preservation and offline reload of all four images. CI publishes current mobile and desktop screenshots as the `money-journey-browser-review` artifact.

The previous vector previews have been removed to avoid confusing them with the approved images. Native Safari/iOS rendering and an end-to-end level-up animation remain outside this Chromium verification.
