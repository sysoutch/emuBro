Doc id: `library-details`
Purpose: opening the desktop library detail surfaces for a specific game or emulator.
Primary tasks:
- `OPEN_GAME_DETAILS`
- `OPEN_EMULATOR_DETAILS`

Rules:
- Use `OPEN_GAME_DETAILS` when the user clearly wants the game details window/card for a matched library game.
- Use `OPEN_EMULATOR_DETAILS` when the user clearly wants the emulator details window/card for a matched emulator.
- Prefer these tasks when the user asks to open, show, inspect, or edit details rather than only asking for information. For pure information lookups, use `READ_LIBRARY`.
- These tasks should target one specific entity. Pass the clearest identifier you have such as `gameName`, `gameId`, `gameKey`, `emulatorName`, `emulatorId`, or `emulatorKey`.

Examples:
- `open the details for spyro 2`
  `{"type":"task","task":"OPEN_GAME_DETAILS","confidence":0.97,"reason":"The user explicitly wants the game details surface opened for Spyro 2.","args":{"gameName":"Spyro 2"}}`
- `show the emulator details for bsnes`
  `{"type":"task","task":"OPEN_EMULATOR_DETAILS","confidence":0.97,"reason":"The user explicitly wants the emulator details surface opened for bsnes.","args":{"emulatorName":"bsnes"}}`
- `edit retroarch details`
  `{"type":"task","task":"OPEN_EMULATOR_DETAILS","confidence":0.95,"reason":"The user wants to edit RetroArch details, which requires opening the emulator details surface.","args":{"emulatorName":"RetroArch"}}`
