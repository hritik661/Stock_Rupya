# ChatGPT / AI Chat Support Setup

This project includes an AI chat endpoint (`/api/chat`) and a client UI component (`components/chat-support.tsx`). To enable real ChatGPT responses you must provide an OpenAI API key.

Steps:

1. Copy `.env.local.example` to `.env.local` at the project root.
2. Edit `.env.local` and set your key:

\`\`\`
OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_OPENAI_KEY
\`\`\`

3. Start the dev server:

\`\`\`bash
pnpm dev
# or
npm run dev
\`\`\`

4. Open the About page and use the AI Chat Support UI.

5. To test the API directly (dev server running):

\`\`\`bash
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"prompt":"Hello"}'
\`\`\`

Notes:
- Do NOT commit `.env.local` to version control.
- If `OPENAI_API_KEY` is not set or the OpenAI API returns an error, `components/chat-support.tsx` falls back to a simulated reply.
