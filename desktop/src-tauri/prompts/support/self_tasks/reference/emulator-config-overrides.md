Doc id: `emulator-config-overrides`
Purpose: changing stored emulator override values in the local shell configuration.
Primary tasks:
- `CHANGE_EMULATOR_WEBSITE`
- `CHANGE_EMULATOR_LAUNCH_ARGS`
- `CHANGE_EMULATOR_WORKING_DIRECTORY`
- `CHANGE_EMULATOR_CONFIG_PATH`
- `CHANGE_EMULATOR_RUN_COMMANDS_BEFORE`
- `CLEAR_EMULATOR_OVERRIDE_FIELDS`

Rules:
- Use these tasks when the user clearly wants to change emulator override settings directly from support/chat.
- Always target one specific emulator with `emulatorName`, `emulatorId`, or `emulatorKey`.
- For value-setting tasks, pass the new value in the most relevant field such as `website`, `launchArgs`, `workingDirectory`, `configFilePath`, or `runCommandsBefore`.
- Use `CLEAR_EMULATOR_OVERRIDE_FIELDS` when the user clearly wants one or more override fields removed/reset.
- If the user wants to inspect or manually edit a wider emulator configuration surface first, prefer `OPEN_EMULATOR_DETAILS`.

Examples:
- `set the website for bsnes to https://bsnes.dev`
  `{"type":"task","task":"CHANGE_EMULATOR_WEBSITE","confidence":0.97,"reason":"The user explicitly wants to change the stored website override for bsnes.","args":{"emulatorName":"bsnes","website":"https://bsnes.dev"}}`
- `set duckstation launch args to --fullscreen`
  `{"type":"task","task":"CHANGE_EMULATOR_LAUNCH_ARGS","confidence":0.97,"reason":"The user explicitly wants to change DuckStation launch arguments.","args":{"emulatorName":"DuckStation","launchArgs":"--fullscreen"}}`
- `change retroarch working directory to D:\\Emulators\\RetroArch`
  `{"type":"task","task":"CHANGE_EMULATOR_WORKING_DIRECTORY","confidence":0.96,"reason":"The user explicitly wants to change the stored working directory for RetroArch.","args":{"emulatorName":"RetroArch","workingDirectory":"D:\\\\Emulators\\\\RetroArch"}}`
- `set the config path for xemu to C:\\Emulators\\xemu\\xemu.toml`
  `{"type":"task","task":"CHANGE_EMULATOR_CONFIG_PATH","confidence":0.96,"reason":"The user explicitly wants to change the stored config file path for xemu.","args":{"emulatorName":"xemu","configFilePath":"C:\\\\Emulators\\\\xemu\\\\xemu.toml"}}`
- `set pcsx2 pre launch commands to start /min joytokey.exe`
  `{"type":"task","task":"CHANGE_EMULATOR_RUN_COMMANDS_BEFORE","confidence":0.95,"reason":"The user explicitly wants to change pre-launch commands for PCSX2.","args":{"emulatorName":"PCSX2","runCommandsBefore":"start /min joytokey.exe"}}`
- `clear the launch args and working directory overrides for retroarch`
  `{"type":"task","task":"CLEAR_EMULATOR_OVERRIDE_FIELDS","confidence":0.94,"reason":"The user explicitly wants to clear specific emulator override fields for RetroArch.","args":{"emulatorName":"RetroArch","fields":["launch-args","working-directory"]}}`
