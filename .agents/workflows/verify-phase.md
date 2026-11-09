# /verify-phase
1. Run backend tests (pytest) and frontend lint, typecheck and tests. Report pass/fail counts.
2. Start backend and frontend. Hit /health and /docs.
3. Open the app with the browser subagent and click through every page and control touched in this phase. Report any console error, failed network call or dead control.
4. List any acceptance criteria from the phase prompt that are not yet met.
Do not fix anything in this workflow; only report.

