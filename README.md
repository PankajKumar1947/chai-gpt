# ChaiGPT Build - AI Tools & Chat Branching

ChaiGPT is a production-grade AI chat application built on Next.js, Mistral AI, and Prisma, extended with advanced capabilities matching modern chat interfaces like ChatGPT.

**Live Demo:** [https://chai-gpt-one.vercel.app](https://chai-gpt-one.vercel.app)

## Key Features

### 1. AI Tools (Web Search with Tavily)
- **Tool Calling:** Integrated the official `@tavily/core` SDK to query the Tavily Search API for real-time information.
- **LLM Decides:** The LLM (`mistral-large-latest`) automatically decides when to call the web search tool depending on the user query.
- **Streaming & UI States:** Streams tool execution states in real-time. Displays a custom spinner when searching is in progress and renders styled hyperlinks and source titles once results are fetched.
- **Persistence:** Tool calls and tool outputs are persisted in the database as structured message parts.
- **Error Handling:** Gracefully catches network or configuration errors without disrupting the main stream.

### 2. Conversation Branching
- **Message Forking:** Users can edit any previous user message to fork a new branch of the conversation. The AI regenerates its response based on the new context.
- **Branch Switcher:** Renders a custom version switcher (`< Version X (X/Y) >`) next to branched messages, allowing users to switch active history paths.
- **Rename Branches:** Integrated a base-ui/shadcn `Dialog` modal box to rename branches.
- **Delete Branches:** Integrated an `AlertDialog` overlay to safely delete branches and their subsequent descendants (cascading deletes) while updating the active path safely.
- **Hierarchical Persistence:** Implemented a parent-child self-relation (`parentId`) in PostgreSQL via Prisma to store and reconstruct tree paths.

---

## Technical Stack
- **Framework:** Next.js (App Router, Turbopack)
- **AI SDK:** Vercel AI SDK (`ai` v7)
- **LLM Provider:** Mistral AI (`@ai-sdk/mistral`)
- **Search Provider:** Tavily (`@tavily/core`)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Clerk Auth System
- **Styling:** Tailwind CSS, Radix/Base UI components

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database URL (PostgreSQL)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Model & Tool APIs
MISTRAL_API_KEY=your_mistral_api_key
TAVILY_API_KEY=your_tavily_api_key
```

---

## Getting Started

### 1. Install dependencies
```bash
bun install
```

### 2. Sync database schema
```bash
bun run db:push
bun run db:generate
```

### 3. Start development server
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
