Doc id: `game-metadata`
Purpose: resolving a specific local game first and reading any locally recorded game release date before fallback reasoning.
Primary tasks:
- `GAME_RELEASE_DATE`

Rules:
- Use `GAME_RELEASE_DATE` when the user asks for the release date of a specific game title.
- Resolve the exact game from the local library first so you know which title or regional variant you are talking about.
- If the runtime returns a locally recorded game release date, answer from that local data directly.
- If the runtime reports that no local game release date is recorded, continue with fallback reasoning for the confirmed game title instead of switching to a platform hardware date.
- Do not replace a game release-date question with `RELEASE_DATE` for the console/platform unless the user explicitly changes the question to hardware.
- In the final answer, explicitly label the source as `Local library` or `Fallback reasoning`.

Examples:
- `when did super metroid release?`
  `{"type":"task","task":"GAME_RELEASE_DATE","confidence":0.98,"reason":"The user asked for a specific game's release date, so I should resolve the game locally first.","args":{"gameName":"Super Metroid"}}`
- `what year did spyro 2 come out in europe?`
  `{"type":"task","task":"GAME_RELEASE_DATE","confidence":0.98,"reason":"Need to resolve the exact local game entry before answering the game's release date.","args":{"gameName":"Spyro 2","region":"eu"}}`
