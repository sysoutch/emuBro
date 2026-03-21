Doc id: `support-workspace-controls`
Purpose: manipulating the active support workspace itself without asking the user to manually click fields and toggles.
Primary tasks:
- `CHANGE_SUPPORT_MODE`
- `CHANGE_PLATFORM`
- `CHANGE_EMULATOR`
- `CHANGE_ISSUE_TYPE`
- `CHANGE_ISSUE_SUMMARY`
- `APPEND_DETAILS`
- `CLEAR_SUPPORT_FIELD`
- `CLEAR_SUPPORT_SESSION`
- `TOGGLE_AUTO_SPECS`
- `TOGGLE_WEB_ACCESS`
- `TOGGLE_DEBUG_CONTEXT`

Rules:
- Use these tasks when the user clearly wants the support UI/context changed and the intended target is explicit.
- Prefer direct support-workspace control tasks over telling the user to click mode tabs, type into fields, or toggle checkboxes manually.
- Use `CHANGE_SUPPORT_MODE` for switching between `troubleshoot`, `chat`, and `help`.
- Use `CHANGE_PLATFORM`, `CHANGE_EMULATOR`, and `CHANGE_ISSUE_TYPE` when the user wants those support fields changed directly.
- Use `CHANGE_ISSUE_SUMMARY` when the user wants the main support message/summary replaced.
- Use `APPEND_DETAILS` when the user wants additional notes added to the details field without losing the existing details.
- Use `CLEAR_SUPPORT_FIELD` to clear one or more specific fields. Supported fields are `platform`, `emulator`, `issueSummary`, `errorText`, and `details`.
- Use `CLEAR_SUPPORT_SESSION` when the user explicitly wants the whole current support session cleared or reset.
- Use `TOGGLE_AUTO_SPECS`, `TOGGLE_WEB_ACCESS`, and `TOGGLE_DEBUG_CONTEXT` when the user explicitly wants those support toggles enabled or disabled.
- If the user’s intent is obvious, do the task directly instead of asking a redundant confirmation question.

Examples:
- `switch to troubleshoot mode`
  `{"type":"task","task":"CHANGE_SUPPORT_MODE","confidence":0.98,"reason":"The user explicitly wants the support workspace switched to troubleshoot mode.","args":{"mode":"troubleshoot"}}`
- `set platform to ps1 and emulator to duckstation`
  `{"type":"reply","message":"Updating the support workspace for PlayStation troubleshooting.","followUpTask":{"task":"CHANGE_PLATFORM","confidence":0.97,"reason":"The user explicitly wants the support platform changed to PS1.","args":{"platform":"PS1"}}}`
  Then follow with:
  `{"type":"task","task":"CHANGE_EMULATOR","confidence":0.97,"reason":"The user explicitly wants the support emulator changed to DuckStation.","args":{"emulator":"DuckStation"}}`
- `change the issue type to performance`
  `{"type":"task","task":"CHANGE_ISSUE_TYPE","confidence":0.97,"reason":"The user explicitly wants the troubleshooting issue type changed.","args":{"issueType":"performance"}}`
- `replace the summary with: retroarch crashes on launch`
  `{"type":"task","task":"CHANGE_ISSUE_SUMMARY","confidence":0.98,"reason":"The user explicitly wants the summary field replaced.","args":{"summary":"RetroArch crashes on launch"}}`
- `add this to the details: happens after enabling vulkan`
  `{"type":"task","task":"APPEND_DETAILS","confidence":0.96,"reason":"The user explicitly wants more information appended to the support details.","args":{"details":"Happens after enabling Vulkan."}}`
- `clear the emulator and error text fields`
  `{"type":"task","task":"CLEAR_SUPPORT_FIELD","confidence":0.97,"reason":"The user explicitly wants specific support fields cleared.","args":{"fields":["emulator","errorText"]}}`
- `reset this support session`
  `{"type":"task","task":"CLEAR_SUPPORT_SESSION","confidence":0.98,"reason":"The user explicitly wants the current support session cleared.","args":{}}`
- `turn on debug context`
  `{"type":"task","task":"TOGGLE_DEBUG_CONTEXT","confidence":0.97,"reason":"The user explicitly wants debug context enabled.","args":{"enabled":true}}`
- `disable web access for now`
  `{"type":"task","task":"TOGGLE_WEB_ACCESS","confidence":0.97,"reason":"The user explicitly wants support web access disabled.","args":{"enabled":false}}`
