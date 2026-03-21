Doc id: `help-docs`
Purpose: local help article discovery and reading.
Primary tasks:
- `LIST_HELP_DOCS`
- `READ_HELP_DOC`

Rules:
- Use `LIST_HELP_DOCS` when the user wants available help topics for a phrase or area.
- Use `READ_HELP_DOC` when the user wants a specific help article opened, summarized, or quoted.
- Use `args.docId` when you already know the document id. Otherwise use `args.query` and let the runtime resolve a match.

Examples:
- `show me help docs about controller setup`
  `{"type":"task","task":"LIST_HELP_DOCS","confidence":0.95,"reason":"Need current help-doc matches for that topic.","args":{"query":"controller setup"}}`
- `open the BIOS help doc`
  `{"type":"task","task":"READ_HELP_DOC","confidence":0.95,"reason":"Need to read the matching local help article.","args":{"query":"bios"}}`
