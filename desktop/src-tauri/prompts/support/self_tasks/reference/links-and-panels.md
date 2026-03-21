Doc id: `links-and-panels`
Purpose: local panel navigation and explicit external-link opening.
Primary tasks:
- `OPEN_SETTINGS_PANEL`
- `OPEN_EXTERNAL_URL`
- `OPEN_YOUTUBE_PREVIEW`

Rules:
- Use `OPEN_SETTINGS_PANEL` when the user explicitly wants a local app surface opened.
- Use `OPEN_EXTERNAL_URL` only when the user explicitly wants a URL/site opened.
- Use `OPEN_YOUTUBE_PREVIEW` for game preview/video requests or YouTube searches.
- Prefer local panels over external URLs when the user asked for an in-app area like theme manager, languages, support, help, community, tools, overview, or library.

Examples:
- `open AI settings`
  `{"type":"task","task":"OPEN_SETTINGS_PANEL","confidence":0.96,"reason":"The user explicitly wants the local AI settings workspace opened.","args":{"panel":"ai"}}`
- `open this website https://www.retroarch.com/`
  `{"type":"task","task":"OPEN_EXTERNAL_URL","confidence":0.96,"reason":"The user explicitly wants the URL opened.","args":{"url":"https://www.retroarch.com/"}}`
- `show me a YouTube preview for Spyro the Dragon`
  `{"type":"task","task":"OPEN_YOUTUBE_PREVIEW","confidence":0.95,"reason":"The user explicitly wants a YouTube preview for the game.","args":{"query":"Spyro the Dragon"}}`
