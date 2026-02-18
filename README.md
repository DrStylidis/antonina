# Antonina

AI-powered personal executive assistant for macOS. Manages your emails, calendar, and tasks with intelligent automation and a conversational interface.
Fully customizable — personalize Antonina with your identity, contacts, and communication style via `config.yaml`.

Built with Electron, React, and Claude AI.

<!-- screenshot here -->

## What It Does

- **Email Triage** — Fetches Outlook emails via Microsoft Graph API, classifies them (important / normal / noise), and generates AI draft replies
- **Calendar Management** — Shows today/tomorrow events, create meetings via chat with human approval before execution
- **Task Sync** — Reads today's tasks from Things 3 via AppleScript, supports create/update/delete through the agent
- **Daily Briefings** — AI-generated morning briefings combining emails, calendar, and tasks into an actionable summary
- **Conversational Chat** — Ask Antonina to check your schedule, draft emails, book meetings, or manage tasks
- **Smart Autonomy** — 3-tier risk classification (low/medium/high) with configurable autonomy modes (conservative/balanced/executive) that control which actions auto-execute vs. require approval
- **Goal Management** — Persistent goals that Antonina monitors proactively (inbox control, meeting prep, task review) with periodic checking and automated agent sessions when goals need attention
- **Meeting Notes** — Reads Granola's local AI-generated meeting summaries (action items, decisions, key points) and displays the last week's meetings in a dedicated view — zero additional API cost
- **Learning System** — Tracks approval patterns, edit frequency, and decision timing; injects learned preferences into future agent sessions
- **Planning & Reflection** — Agent plans actions before executing and reflects after sessions, storing insights for future context
- **Agent Memory** — Persistent memory system for contact notes, thread context, preferences, reflections, and pending items

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 39.6 + Node 22 |
| Build | electron-vite 5 + Vite 7 + TypeScript 5 |
| Frontend | React 19 + Tailwind CSS v4 + shadcn/ui (Radix) |
| Database | better-sqlite3 (local SQLite, WAL mode) |
| AI | Claude API (Sonnet 4.5 for agent/chat, Haiku 4.5 for triage/reflection) |
| Email/Calendar | Microsoft Graph API (OAuth2 PKCE flow) |
| Tasks | Things 3 via AppleScript |
| Meeting Notes | Granola local cache (AI-generated summaries) |
| External Tools | Model Context Protocol (MCP) servers for Outlook calendar, Things 3 writes, Calendly, Granola |
| Packaging | electron-builder -> macOS .app / DMG |

## Autonomy System

Antonina uses a risk-based autonomy system that classifies every action by risk level and decides whether to auto-execute or require human approval.

### Risk Levels

| Level | Examples |
|-------|----------|
| **Low** | fetch_emails, fetch_calendar, read_tasks, show_notification, generate_briefing, read/update memory |
| **Medium** | create_calendar_event, draft_reply, delete_task, request_human_review |
| **High** | send_email, delete_calendar_event, update_calendar_event |

### Autonomy Modes

| Mode | Low Risk | Medium Risk | High Risk |
|------|----------|-------------|-----------|
| **Conservative** | Auto | Approve | Approve |
| **Balanced** (default) | Auto | Auto + notify | Approve |
| **Executive** | Auto | Auto + notify | Auto + notify |

Change the autonomy mode in Settings. Medium/high actions that auto-execute still emit activity notifications so you can review what happened.

### Goals

Antonina monitors 3 built-in goals and can trigger focused agent sessions when they need attention:

1. **Inbox Under Control** — Keep unread important emails manageable; triggers triage when needed
2. **Meetings Prepped** — Prepare briefings before upcoming meetings
3. **Tasks Reviewed** — Review and update today's task list during morning sweep

Goals are checked every 30 minutes. Enable/disable individual goals in Settings.

### Learning

The system tracks your approval decisions over time:
- Approval/rejection rates per action type
- How often you edit drafts before approving
- How long decisions take

These patterns are injected into the agent's context so it learns your preferences (e.g., "User edits 40% of email drafts — prefer shorter, more formal tone").

### Planning & Reflection

**Before acting:** The agent assesses what information it needs, plans its sequence of actions, and considers risks before executing.

**After each session:** A lightweight reflection call (using the cheaper triage model) summarizes what happened and notes patterns about your preferences. These reflections are stored in memory and loaded into future sessions.

## Architecture

```
Renderer Process (React 19 + Tailwind v4 + shadcn/ui)
  Views: Briefing, Emails, Schedule, Tasks, Meetings, Activity, History, Settings
                     |
                     | IPC Bridge (30+ handlers)
                     |
Main Process (Electron + Node)
  |- Graph API (email, calendar, OAuth2 PKCE)
  |- AppleScript (Things 3 read)
  |- Agent Orchestrator
  |    |- 18 built-in tools + MCP tools
  |    |- Risk-based safety (low/medium/high)
  |    |- Goal management + periodic checking
  |    |- Learning system (feedback tracking)
  |    |- Planning + post-session reflection
  |    |- Memory system (journals, reflections, pending items)
  |- SQLite DB (WAL mode)
  |- Granola Cache Reader (meeting notes + AI summaries)
  |- MCP Client
       |- outlook-mcp-server
       |- things3-mcp-server
       |- calendly-mcp-server
       |- granola-mcp-server
```

**Key design decisions:**
- **Hybrid data access** — Graph API for email (richer data), MCP for calendar writes (shared with other tools), AppleScript for Things 3 reads (fastest)
- **Risk-based safety** — Every tool call classified as low/medium/high risk; autonomy mode determines auto-execute vs. approval queue routing
- **Local-first** — SQLite database stored in app userData; no cloud backend needed
- **MCP tool naming** — External tools namespaced as `serverName__toolName` (double underscore)

## Project Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # App entry, window management, .env loader
│   ├── ipc/                       # IPC handlers (30+ endpoints)
│   │   ├── emails.ts              # Email fetch, draft, send, archive
│   │   ├── schedule.ts            # Calendar events
│   │   ├── chat.ts                # Chat session management
│   │   ├── agent.ts               # Approval queue, agent sessions, feedback logging
│   │   ├── tasks.ts               # Things 3 task operations
│   │   ├── briefing.ts            # Daily briefing generation
│   │   ├── settings.ts            # App configuration + autonomy mode
│   │   ├── goals.ts               # Goal management CRUD
│   │   ├── meetings.ts            # Granola meeting notes
│   │   └── health.ts              # System health checks
│   └── services/
│       ├── agent/                  # AI agent system
│       │   ├── orchestrator.ts     # Autonomous agent session loop + reflection
│       │   ├── chat-session.ts     # Interactive chat with tool calling
│       │   ├── tools.ts            # 18 built-in tools + MCP integration
│       │   ├── safety.ts           # Risk classification, autonomy modes, rate limiting
│       │   ├── goal-checker.ts     # Periodic goal monitoring + session triggers
│       │   ├── mcp-client.ts       # MCP server lifecycle management
│       │   └── context.ts          # Full context builder (identity, memory, goals, learning, time)
│       ├── ai/                     # LLM services
│       │   ├── client.ts           # Anthropic SDK client
│       │   ├── briefing.ts         # Briefing generation prompts
│       │   ├── classify.ts         # Email classification
│       │   └── drafts.ts           # Draft reply generation
│       ├── graph/                  # Microsoft Graph API
│       │   ├── auth.ts             # OAuth2 PKCE flow
│       │   ├── mail.ts             # Email operations
│       │   └── calendar.ts         # Calendar operations
│       ├── db/                     # SQLite database layer
│       │   ├── schema.ts           # Table definitions + migrations
│       │   ├── agent.ts            # Sessions, actions, approvals
│       │   ├── chat.ts             # Chat message history
│       │   ├── memory.ts           # Agent persistent memory
│       │   ├── feedback.ts         # Action feedback tracking + stats
│       │   ├── goals.ts            # Goals CRUD + seed defaults
│       │   ├── briefings.ts        # Stored briefings
│       │   └── costs.ts            # API cost tracking
│       ├── granola/                # Granola meeting note integration
│       │   └── parser.ts           # Cache reader + meeting parser
│       ├── applescript/            # macOS automation
│       │   ├── things.ts           # Read tasks from Things 3
│       │   └── things-write.ts     # Create/update/delete tasks
│       ├── config.ts               # YAML config loader
│       ├── scheduler.ts            # Cron-based automation + goal checking
│       └── tray.ts                 # Menu bar tray icon
│
├── renderer/                       # React frontend
│   └── src/
│       ├── App.tsx                 # Root component, view routing
│       ├── components/
│       │   ├── layout/             # Sidebar navigation
│       │   ├── views/              # Page views
│       │   │   ├── briefing/       # Daily briefing display
│       │   │   ├── emails/         # Email list, detail, draft panel
│       │   │   ├── schedule/       # Calendar + embedded chat
│       │   │   ├── tasks/          # Things 3 task cards
│       │   │   ├── meetings/       # Granola meeting notes + AI summaries
│       │   │   ├── activity/       # Approval queue + auto-executed actions
│       │   │   ├── history/        # Agent session logs
│       │   │   └── settings/       # Configuration, autonomy mode, goals
│       │   ├── ui/                 # shadcn/ui primitives
│       │   └── shared/             # Reusable components
│       ├── hooks/                  # Custom React hooks
│       └── types/                  # TypeScript interfaces
│
└── preload/                        # Electron preload bridge
    └── index.ts                    # Type-safe IPC API exposure
```

## Getting Started

### Prerequisites

- **Node.js** 20+ (22 recommended)
- **macOS** (required for Things 3 AppleScript integration)
- **Things 3** installed (for task management)
- **Granola** (optional, for meeting notes — Business plan required for MCP)
- **Microsoft 365 account** (for email and calendar)
- **Anthropic API key** (for Claude AI)

### Install

```bash
npm install
```

### Configuration

Copy the example config and customize it for your identity:

```bash
cp config.example.yaml config.yaml
```

Edit `config.yaml` to set your name, company, timezone, VIP contacts, and communication preferences. See `config.example.yaml` for all available options.

### Environment Variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=your-anthropic-api-key
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_TENANT_ID=common
```

The Microsoft Client ID comes from an [Azure App Registration](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps) with these redirect URIs:
- `http://localhost:3847/callback`

Required API permissions: `Calendars.ReadWrite`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `User.Read`, `offline_access`

### Development

```bash
npm run dev
```

This starts electron-vite in dev mode with hot reload for the renderer process.

### Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

## Packaging as a Standalone App

Build and install to `/Applications`:

```bash
./rebuild.sh
```

This runs `npm run build:mac`, copies `Antonina.app` to `/Applications`, and clears the macOS quarantine flag.

To update after code changes, just run `./rebuild.sh` again.

## Configuration

The app uses `config.yaml` for business logic settings:

```yaml
email:
  vip_contacts: ["important@example.com"]
  noise_patterns: ["newsletter", "noreply"]
schedule:
  morning_sweep: "07:30"
  evening_sweep: "18:00"
agent:
  max_sessions_per_hour: 10
  max_daily_cost_usd: 5.0
  autonomy_mode: balanced  # conservative | balanced | executive
api:
  agent_model: "claude-sonnet-4-5-20250929"
  triage_model: "claude-haiku-4-5-20251001"
```

Settings can also be changed from within the app (Settings view).

### MCP Servers

Antonina connects to external MCP servers for extended tool access. Configure server paths in `config.yaml`:

```yaml
mcp_servers:
  - name: "outlook"
    command: "node"
    args: ["/path/to/outlook-mcp-server/dist/index.js"]
  - name: "things3"
    command: "node"
    args: ["/path/to/things3-mcp-server/dist/index.js"]
```

The default setup supports:
- `outlook-mcp-server` — Outlook calendar read/write
- `things3-mcp-server` — Things 3 task creation via URL scheme
- `calendly-mcp-server` — Calendly scheduling operations
- `granola-mcp-server` — Granola meeting search and analysis (optional, requires [GranolaMCP](https://github.com/pedramamini/GranolaMCP))

### Granola Integration

The Meeting Notes view reads Granola's local cache directly (`~/Library/Application Support/Granola/cache-v3.json`) to display the last week's meetings with Granola's own AI-generated summaries — no additional Claude API cost. This works independently of the Granola MCP server.

If you also want the agent to search/analyze meetings via chat, install the GranolaMCP server:

```bash
git clone https://github.com/pedramamini/GranolaMCP.git
cd GranolaMCP && pip install -e .
```

Then add it to your `config.yaml`:

```yaml
mcp_servers:
  - name: "granola"
    command: "python3"
    args: ["-m", "granola_mcp.mcp"]
```

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE) for details.
