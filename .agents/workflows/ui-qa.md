# /ui-qa
Using the browser subagent, load the app at 360x800, 390x844, 430x932, 768x1024, 1024x768, 1440x900 and 1920x1080. For each of Overview, AI CFO, Cash Flow, Transactions, Invoices, Payments, Forecasts, AI Agents, Reports, Settings:
- capture a screenshot
- check there is no horizontal overflow
- check touch targets are at least 44px on mobile
- check tables become cards or scroll cleanly on mobile
- compare against the matching screen in design/ and list visual deviations.
Return a table of failures with the page, viewport and a one-line description.

