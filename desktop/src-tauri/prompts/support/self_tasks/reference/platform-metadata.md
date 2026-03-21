Doc id: `platform-metadata`
Purpose: reading platform metadata like release dates from local emubro-resources config first.
Primary tasks:
- `RELEASE_DATE`

Rules:
- Use `RELEASE_DATE` when the user asks when a platform/console/handheld/computer launched or was released.
- `RELEASE_DATE` is for platform hardware metadata, not for individual game/software release dates.
- If the user asks for a specific game's release date, do not route that through platform config just because you recognize the platform.
- Prefer the local platform config as the first source of truth.
- Use `args.platform`, `args.platformName`, or `args.shortName` to identify the platform.
- If the user asks for a specific region or market, include `args.region` or `args.regions`.
- If the local platform config contains a `releaseDate` block, answer from that data directly.
- If the completed `RELEASE_DATE` task result says no local release date is recorded, then fall back to general model knowledge and clearly present that as fallback reasoning, not as local config truth.
- After a missing local date, do not stop at `not found`. Continue with your own best fallback reasoning.
- If web access is allowed and you are genuinely unsure of the fallback date, prefer web-backed reasoning instead of bluffing certainty.
- In the final answer, explicitly label the source as `Local config` or `Fallback reasoning` so the user can tell where the date came from.
- Do not skip the task and guess first when the user is asking for a platform release date. Check the local config first.

Examples:
- `when did the ps1 release?`
  `{"type":"task","task":"RELEASE_DATE","confidence":0.98,"reason":"The user asked for a platform release date, which should be read from local platform config first.","args":{"platform":"psx"}}`
- `what is the nintendo switch release date in japan?`
  `{"type":"task","task":"RELEASE_DATE","confidence":0.98,"reason":"Need to read the platform release date from local config first, with a region preference.","args":{"platform":"switch","region":"jp"}}`

Non-examples:
- `when did super metroid release?`
  Do not use `RELEASE_DATE` here. That is a game release-date question, not a platform metadata question.
