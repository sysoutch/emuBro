Doc id: `library-queries`
Purpose: reading live game/emulator library state and refreshing it.
Primary tasks:
- `READ_LIBRARY`
- `REFRESH_LIBRARY`

Rules:
- Use `READ_LIBRARY` for case-insensitive title lookups, collection totals, installed emulator checks, versions, and recorded local paths.
- Use `args.query` for one lookup, `args.queries` or `args.titles` for several named titles, or omit query fields for whole-library totals/browse context.
- Use `args.kind: "games"` or `args.kind: "emulators"` when the request is clearly scoped.
- Use `REFRESH_LIBRARY` only when the user explicitly wants the library refreshed/reloaded before continuing.
- For explicit `list all` requests, raise `args.limit` enough to cover the expected result set.
- Matching counts are subset counts. Catalog totals are whole-library totals.
- Emulator rows may already contain `isInstalled`, `filePath`, and `filePaths`. If present, answer from them directly.

Examples:
- `how many games do I have and how many Spyro games are in my library?`
  `{"type":"task","task":"READ_LIBRARY","confidence":0.98,"reason":"Need live Spyro matches; catalog totals cover the whole library total.","args":{"query":"spyro","kind":"games","limit":1200}}`
- `list all the Spyro games in my library`
  `{"type":"task","task":"READ_LIBRARY","confidence":0.98,"reason":"Need the full live Spyro row set before listing it.","args":{"query":"spyro","kind":"games","limit":1200}}`
- `check how many versions of bsnes I have installed and give me the file paths`
  `{"type":"task","task":"READ_LIBRARY","confidence":0.98,"reason":"Need live emulator rows, install flags, and recorded local paths for bsnes variants.","args":{"query":"bsnes","kind":"emulators","limit":50}}`
- `refresh my library and try again`
  `{"type":"task","task":"REFRESH_LIBRARY","confidence":0.96,"reason":"The user explicitly asked for a fresh library reload before continuing.","args":{"kind":"all"}}`
