# FlowPilot AI — Universal Automation Builder (prototype v0.1)

An iPhone-friendly, free, static web app prototype. Includes three YouTube channel templates, a rule-based workflow planner, workflow storage, JSON import/export, and a local validation/simulation interface.

## Start

1. Extract this ZIP on a computer or in a compatible online development environment.
2. Serve the folder over HTTP(S). Example on a computer with Python: `python3 -m http.server 8000`, then visit `http://localhost:8000`.
3. For iPhone use, upload these static files to a hosting service such as GitHub Pages or Cloudflare Pages. Visit the HTTPS URL in Safari and choose Share > Add to Home Screen. Hosting plans and limits may change.
4. Open the Dashboard, inspect one of the three channel workflows, and run Test & Repair.
5. Export a JSON backup regularly. Workflows are stored only in this browser's localStorage; clearing browser data may erase them.

## What works

- Responsive iPhone browser UI
- Three editable-through-JSON template workflows
- Rule-based workflow plan creation
- Safe local simulation and missing-configuration warnings
- JSON workflow export/import and local persistence
- Installable-web-app manifest and basic offline caching when hosted properly

## Not yet implemented

- LLM-powered natural-language workflow generation
- Gemini, YouTube, Google Sheets, or Make.com API connections
- Real workflow execution, automatic repairs, video creation, or publishing
- User accounts, encrypted credential storage, cloud sync

## Next engineering milestone

Add a backend with authenticated user accounts, server-side encrypted secrets, OAuth connectors, a typed workflow engine, execution logs, approval gates, and provider-specific integration tests. Google YouTube API permissions and platform policies must be followed. Never embed service credentials in this static frontend. Consider using a secure backend such as FastAPI with PostgreSQL and a job queue; deploy on a plan with verified limits before enabling recurring jobs.

## Safety

The app does not publish anything, send external requests, or automatically change third-party accounts. 'Mark configured' only updates a local boolean and does not verify credentials or a service connection. Always require user approval before public publishing or other consequential actions.
