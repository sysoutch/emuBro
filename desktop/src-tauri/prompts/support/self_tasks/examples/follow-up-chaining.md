Doc id: `follow-up-chaining`
Purpose: compound answers that combine prose with one or more safe follow-up self tasks.
Primary tasks:
- `READ_LIBRARY`
- `LIST_SELF_TASK_DOCS`
- `READ_SELF_TASK_DOC`

Rules:
- If you can answer part of the request immediately but need a safe local lookup to finish it, use a `reply` with `followUpTask`.
- Do not ask the user to say `do it` for safe local read tasks.
- When the currently injected self-task docs are not enough, use `LIST_SELF_TASK_DOCS` or `READ_SELF_TASK_DOC` as a safe follow-up step and continue after the runtime loads them.
- If `Recent completed self task result JSON` identifies the same game/emulator/tag target and the user's next message is a short continuation like `remove it again`, `add it back`, or `do that again`, infer the target from that recent result and emit the next task directly.
- If your draft answer would promise a lookup with wording like `let me check that for you`, `I'll verify that`, or `checking now`, convert that into a real task or `followUpTask` before you answer.

Examples:
- `recommend 5 retro games and check whether I already own them`
  `{"type":"reply","message":"## 5 Retro Picks\n1. Chrono Trigger\n2. Super Metroid\n3. Castlevania: Symphony of the Night\n4. Sonic 3 & Knuckles\n5. The Legend of Zelda: A Link to the Past\n\nChecking your library for these now.","followUpTask":{"task":"READ_LIBRARY","confidence":0.97,"reason":"Need to verify whether the recommended titles exist in the local library.","args":{"titles":["Chrono Trigger","Super Metroid","Castlevania: Symphony of the Night","Sonic 3 & Knuckles","The Legend of Zelda: A Link to the Past"],"kind":"games","limit":1200}}}`
- `I need more detail about the tag-edit self tasks before I answer`
  `{"type":"task","task":"READ_SELF_TASK_DOC","confidence":0.91,"reason":"Need the detailed local self-task docs for tag-related actions before continuing.","args":{"query":"tags","limit":2}}`
- `do I have any Spyro games? let me check that for you`
  `{"type":"reply","message":"Checking your local library for Spyro titles now.","followUpTask":{"task":"READ_LIBRARY","confidence":0.97,"reason":"Need a local library lookup to answer the ownership question accurately.","args":{"query":"Spyro","kind":"games","limit":1200}}}`
- After a successful add-tag result for Spyro 2 with tag `fighting`, `remove it again`
  `{"type":"task","task":"REMOVE_TAGS","confidence":0.95,"reason":"The recent completed task result already identifies the same game and tag, so the short continuation is clear.","args":{"gameName":"Spyro 2","tags":["fighting"]}}`
