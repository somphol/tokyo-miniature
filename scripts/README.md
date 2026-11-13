# Scripts

- `notices.mjs` — collect the MIT licence texts of the production dependency closure.
- `inline-build.mjs` — fold the Vite JS/CSS and notices into one offline HTML file.
- `verify.mjs` — load the single file in capture mode and run 30 deterministic checks: eight flights,
  cards and aria state, day/night, reset, zoom, orbit, pan, rotate, facts, locales, the 345 embed,
  no console errors and no external requests.
- `shoot.mjs` — visual screenshots (overview day/night, one per landmark, embed). Not a pass/fail
  gate.

`CHROME_PATH` selects the browser. On this Mac the scripts use Chrome with SwiftShader; virtual time
and a single capture shadow pass keep the checks fast.
