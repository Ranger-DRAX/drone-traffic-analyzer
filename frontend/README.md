# Frontend

Next.js + TypeScript client for the Smart Drone Traffic Analyzer proof of concept.

## Setup

Install dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Run commands from the `frontend` folder. Starting Next.js from the workspace root can cause module-resolution issues.

Create a local environment file from `.env.example`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

For a deployed Hugging Face backend, set:

```bash
NEXT_PUBLIC_API_BASE_URL=https://<space-name>.hf.space/api
```

## Local URL

Open the app at:

```text
http://localhost:3000
```

The UI uploads MP4 files, polls job status, and displays the processed video and CSV report once the backend finishes.
# Frontend

Next.js client for uploading drone footage, reviewing analytics, and inspecting generated results.

## Structure

- `app/` contains the route UI.
- `components/` is for reusable interface pieces.
- `lib/` is for shared client-side helpers.
