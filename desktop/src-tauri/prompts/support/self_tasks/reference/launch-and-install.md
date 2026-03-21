Doc id: `launch-and-install`
Purpose: launching games/emulators and emulator install flows.
Primary tasks:
- `RUN_GAME`
- `RUN_EMULATOR`
- `DOWNLOAD_INSTALL_EMULATOR`

Rules:
- Use `RUN_GAME` for game titles from the local library.
- Use `RUN_EMULATOR` only when the user wants the emulator application itself opened.
- Use `DOWNLOAD_INSTALL_EMULATOR` when the user explicitly wants an emulator installed or downloaded.
- Prefer ids/keys from provided rows when available. Fall back to title/name only when needed.
- Do not use `RUN_EMULATOR` just because a game belongs to an emulator/platform.

Examples:
- `run Spyro the Dragon`
  `{"type":"task","task":"RUN_GAME","confidence":0.97,"reason":"The user explicitly wants a game from the local library launched.","args":{"gameName":"Spyro the Dragon"}}`
- `open RetroArch`
  `{"type":"task","task":"RUN_EMULATOR","confidence":0.97,"reason":"The user explicitly wants the emulator application opened.","args":{"emulatorName":"RetroArch"}}`
- `install bsnes`
  `{"type":"task","task":"DOWNLOAD_INSTALL_EMULATOR","confidence":0.95,"reason":"The user explicitly wants an emulator downloaded or installed.","args":{"emulatorName":"bsnes"}}`
