Doc id: `covers-and-artwork`
Purpose: showing or fetching game cover artwork inline in the support conversation.
Primary tasks:
- `FETCH_GAME_COVER`
- `ADD_GAME_COVER`

Rules:
- Use `FETCH_GAME_COVER` when the user asks to show, fetch, display, preview, or find cover art / box art / artwork for a game.
- Use `ADD_GAME_COVER` when the user asks to apply, save, use, add, or set a shown/specified cover on a game.
- Prefer `args.gameId` or `args.gameKey` when the game is already clearly identified from local library context.
- Otherwise use `args.gameName`, `args.title`, or `args.query`.
- Use `args.mode: "library"` when the user wants the currently recorded cover.
- Use `args.mode: "search"` when the user wants alternate cover options, web cover results, or multiple covers.
- Use `args.limit` greater than `1` when the user explicitly asks for several cover options.
- Do not use web cover search when support web access is disabled unless the app explicitly exposes that access for the current request.
- If a cover was just shown in the conversation and the user says `use this one`, `apply that cover`, or similar, `ADD_GAME_COVER` may reuse the most recent shown cover without asking the user to restate the image URL.
- The app can return the cover image inline in the conversation. Do not claim that covers cannot be displayed in chat when this task exists.
- If the user explicitly asks to see the cover now, return the task JSON immediately instead of saying you can do it later.
- If the user explicitly asks to apply the shown cover now, return the `ADD_GAME_COVER` task JSON immediately instead of only describing the game details popup.

Examples:
- `show me the cover for Spyro 2`
  `{"type":"task","task":"FETCH_GAME_COVER","confidence":0.98,"reason":"The user explicitly asked to see the game cover in the conversation.","args":{"gameName":"Spyro 2","mode":"auto","limit":1}}`
- `display the box art for Crash Team Racing`
  `{"type":"task","task":"FETCH_GAME_COVER","confidence":0.98,"reason":"Need to fetch the requested game artwork and show it inline.","args":{"gameName":"Crash Team Racing","mode":"auto","limit":1}}`
- `show me 4 cover options for Chrono Trigger`
  `{"type":"task","task":"FETCH_GAME_COVER","confidence":0.97,"reason":"The user wants several artwork options, so web cover search results are needed.","args":{"query":"Chrono Trigger","mode":"search","limit":4}}`
- `use that cover for Spyro 2`
  `{"type":"task","task":"ADD_GAME_COVER","confidence":0.97,"reason":"The user wants to apply the already shown cover to the matched game.","args":{"gameName":"Spyro 2"}}`
- `set this image as the cover for Crash Team Racing`
  `{"type":"task","task":"ADD_GAME_COVER","confidence":0.96,"reason":"The user explicitly wants to save the specified cover onto the game.","args":{"gameName":"Crash Team Racing","imageUrl":"https://example.com/ctr-cover.jpg"}}`
