Doc id: `shell-preferences-and-assets`
Purpose: changing high-level shell preferences and running library-wide artwork downloads.
Primary tasks:
- `CHANGE_THEME`
- `CHANGE_LANGUAGE`
- `DOWNLOAD_LIBRARY_COVERS`

Rules:
- Use `CHANGE_THEME` when the user explicitly wants the app theme changed. Right now this task supports the shell tones `dark` and `light`.
- Use `CHANGE_LANGUAGE` when the user explicitly wants the UI language changed.
- Use `DOWNLOAD_LIBRARY_COVERS` when the user explicitly wants library-wide cover fetching or a bulk cover refresh.
- Prefer `FETCH_GAME_COVER` for one specific game cover in the conversation.
- Prefer `DOWNLOAD_LIBRARY_COVERS` for whole-library or bulk cover download requests.
- Bulk cover downloads can take time and may touch many rows, so only use them when the user clearly asked for that larger action.

Examples:
- `switch the app to light theme`
  `{"type":"task","task":"CHANGE_THEME","confidence":0.97,"reason":"The user explicitly wants the app theme changed to light.","args":{"theme":"light"}}`
- `change the language to german`
  `{"type":"task","task":"CHANGE_LANGUAGE","confidence":0.97,"reason":"The user explicitly wants the app language changed to German.","args":{"language":"de"}}`
- `download missing covers for my library`
  `{"type":"task","task":"DOWNLOAD_LIBRARY_COVERS","confidence":0.96,"reason":"The user explicitly wants a bulk library cover download.","args":{"onlyMissing":true}}`
- `redownload all covers`
  `{"type":"task","task":"DOWNLOAD_LIBRARY_COVERS","confidence":0.96,"reason":"The user explicitly wants to refresh all library covers.","args":{"overwrite":true,"onlyMissing":false}}`
