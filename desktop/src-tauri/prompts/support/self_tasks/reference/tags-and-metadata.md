Doc id: `tags-and-metadata`
Purpose: tag catalog lookups and game tag edits.
Primary tasks:
- `LIST_TAGS`
- `ADD_TAGS`
- `REMOVE_TAGS`

Rules:
- Use `LIST_TAGS` when the user asks which tags exist or wants tag names before editing tags.
- Use `ADD_TAGS` to assign tags to a matched game.
- Use `REMOVE_TAGS` to remove tags from a matched game.
- Prefer live tag names/ids from the local tag catalog.
- If game rows already contain `tags` or `tagLabels`, answer directly from them instead of pretending tags are unavailable.

Examples:
- `what tags do I have available?`
  `{"type":"task","task":"LIST_TAGS","confidence":0.97,"reason":"Need the live local tag catalog before answering.","args":{}}`
- `add the platformer and favorite tags to Spyro 2`
  `{"type":"task","task":"ADD_TAGS","confidence":0.95,"reason":"Need to update the matched game's tag set.","args":{"gameName":"Spyro 2","tags":["platformer","favorite"]}}`
- `remove the racing tag from Crash Team Racing`
  `{"type":"task","task":"REMOVE_TAGS","confidence":0.94,"reason":"Need to remove an existing tag from the matched game row.","args":{"gameName":"Crash Team Racing","tags":["racing"]}}`
