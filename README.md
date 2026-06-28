# aisdlc-frontend

React 18 developer monitoring dashboard for the AI SDLC Orchestration Platform.

## Features
- Live pipeline stage tracker with status dots
- Real-time WebSocket event log streaming
- Memory viewer (SDLCState fields populate live)
- Tool call inspector (args + results)
- Human approval gate UI (Approve/Reject)
- Repo assignment panel

## Run locally
```bash
npm install
npm run dev
# Opens at http://localhost:3000
# Connects to FastAPI at ws://localhost:8000/ws/events/{id}
```

## Build for production
```bash
npm run build
# Output in dist/ — deploy to S3 + CloudFront
```