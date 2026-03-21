Library workspace control self tasks:

- `CHANGE_LIBRARY_SECTION`
  - Use to switch the main library workspace section.
  - Valid targets include:
    - `all`
    - `suggested`
    - `recent`
    - `emulators`
  - Example:
    - User: `switch the library to emulators`
    - Output:
      `{"type":"task","task":"CHANGE_LIBRARY_SECTION","confidence":0.96,"reason":"The user explicitly asked to switch the current library section.","args":{"section":"emulators"}}`

- `CHANGE_LIBRARY_VIEW`
  - Use to change the current library presentation mode.
  - Valid targets include:
    - `cover`
    - `list`
    - `focus`
    - `slideshow`
    - `random`
  - Example:
    - User: `show the library in list view`
    - Output:
      `{"type":"task","task":"CHANGE_LIBRARY_VIEW","confidence":0.95,"reason":"The user explicitly asked to change the library view mode.","args":{"view":"list"}}`

- `CHANGE_LIBRARY_SEARCH`
  - Use to set or replace the current library search query.
  - Use an empty query only when the user clearly wants the search cleared.
  - Example:
    - User: `search my library for castlevania`
    - Output:
      `{"type":"task","task":"CHANGE_LIBRARY_SEARCH","confidence":0.97,"reason":"The user explicitly asked to search the library view.","args":{"query":"castlevania"}}`

- `CHANGE_LIBRARY_PLATFORM_FILTER`
  - Use to change the library platform filter.
  - Use `all` to clear it.
  - Example:
    - User: `filter the library to ps1 games`
    - Output:
      `{"type":"task","task":"CHANGE_LIBRARY_PLATFORM_FILTER","confidence":0.96,"reason":"The user explicitly asked to filter the library by platform.","args":{"platform":"ps1"}}`

- `CHANGE_LIBRARY_SORT`
  - Use to change the active library sort mode.
  - Supported sorts:
    - `name`
    - `platform`
    - `rating`
    - `recent`
  - Example:
    - User: `sort my library by platform`
    - Output:
      `{"type":"task","task":"CHANGE_LIBRARY_SORT","confidence":0.94,"reason":"The user explicitly asked to change the library sort order.","args":{"sortBy":"platform"}}`

- `CHANGE_LIBRARY_EMULATOR_TYPE`
  - Use when the user is in emulator browsing context and wants a specific emulator type.
  - Supported types:
    - `standalone`
    - `core`
    - `web`
  - This should generally imply the `emulators` section.
  - Example:
    - User: `show only core emulators`
    - Output:
      `{"type":"task","task":"CHANGE_LIBRARY_EMULATOR_TYPE","confidence":0.95,"reason":"The user explicitly asked to filter emulators by type.","args":{"emulatorType":"core"}}`

- `CLEAR_LIBRARY_FILTERS`
  - Use to clear the current library filters/search state.
  - If the user wants a full reset, omit specific fields.
  - If only one part should be cleared, use `args.fields`.
  - Example:
    - User: `clear the library filters`
    - Output:
      `{"type":"task","task":"CLEAR_LIBRARY_FILTERS","confidence":0.95,"reason":"The user explicitly asked to clear the current library filters.","args":{}}`
    - User: `clear just the library search`
    - Output:
      `{"type":"task","task":"CLEAR_LIBRARY_FILTERS","confidence":0.93,"reason":"The user explicitly asked to clear only the current library search.","args":{"fields":["search"]}}`

Rules:
- Use these tasks when the user is asking to control the visible library workspace, not when they are asking for information from the database. For information lookups, still prefer `READ_LIBRARY`.
- Do not answer with click instructions when the user clearly wants you to perform the library workspace change directly.
- If the user asks for a library section plus a search/filter at the same time, it is acceptable to use one task first and then a follow-up task.
