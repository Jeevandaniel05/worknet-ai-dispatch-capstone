# WorkNet Video Script

Target length: 3 to 4 minutes.

## 0:00 - 0:25 Problem

Introduce WorkNet as a concierge agent for home-service emergencies. Explain that customers often do not know whether a problem is electrical, plumbing, repair, or cleaning, and unsafe situations can escalate while they search manually.

## 0:25 - 0:55 Solution

Show the homepage and the AI Dispatch Agent panel. Explain that the customer describes the issue once, and WorkNet creates a dispatch plan.

## 0:55 - 1:35 Agent Architecture

Show the architecture diagram from the README or writeup.

Mention:

- Triage agent classifies the request and urgency.
- Matching agent ranks workers.
- Safety guard agent adds warnings and handoff steps.
- MCP server exposes the same planner as a tool.

## 1:35 - 2:35 Demo

Submit this example:

`Water is leaking fast from the kitchen pipe and spreading near the switch board.`

Address:

`Indiranagar, Bengaluru`

Point out:

- Category and risk level.
- Recommended lead worker.
- Ranked team.
- Safety notes.
- Next actions.

Then briefly show the booking flow and worker dashboard.

## 2:35 - 3:15 Technical Build

Show code files:

- `backend/agents/worknetAgent.js`
- `backend/mcp-server.js`
- `backend/middleware.js`
- `frontend/index.html`
- `frontend/script.js`
- `render.yaml`

Mention tests with `npm test`.

## 3:15 - 3:45 Capstone Concepts

List the concepts demonstrated:

- Multi-agent system
- MCP server
- Security features
- Deployability
- Agent skills

## 3:45 - 4:00 Close

Summarize the value: WorkNet makes home-service dispatch faster, safer, and easier for customers.
