Doc id: `system-specs`
Purpose: system inspection and hardware/spec context.
Primary tasks:
- `FETCH_SPECS`

Rules:
- Use `FETCH_SPECS` when the user wants current machine specs, GPU/CPU/RAM/OS details, or registry/WMIC-backed local system facts.
- If the request is about diagnosing performance, crashes, rendering, drivers, or hardware suitability and no current specs are present, prefer `FETCH_SPECS`.
- If the details already contain a `[PC Specs]` block, do not request `FETCH_SPECS` again unless the user explicitly asks for a refresh.

Examples:
- `what are my specs?`
  `{"type":"task","task":"FETCH_SPECS","confidence":0.99,"reason":"Need current local machine specs from the app runtime.","args":{}}`
- `check my CPU, GPU, and RAM before we troubleshoot this emulator issue`
  `{"type":"task","task":"FETCH_SPECS","confidence":0.97,"reason":"Need current hardware specs before answering the troubleshooting question.","args":{}}`
