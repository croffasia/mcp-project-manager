# 🚀 MCP Project Manager

**Hierarchical Task Management via Model Context Protocol (MCP)**

Transform any MCP-compatible AI assistant into a powerful project manager with automated task breakdown, dependency tracking, and smart workflow management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![MCP Compatible](https://img.shields.io/badge/MCP-compatible-orange.svg)

**Compatible with:** Claude Code • Claude Desktop • Cursor • VS Code + Copilot • Continue.dev • Any MCP Client

📖 **[📚 Complete User Guide](docs/README.md)** | 🔧 **[⚙️ Tools Reference](docs/tools.md)** | 🤖 **[🎯 AI Prompts](docs/prompts.md)**

## ✨ Key Features

🎯 **Hierarchical Project Management**: Ideas → Epics → Tasks with intelligent decomposition  
🤖 **AI-Powered Task Creation**: Automated breakdown using natural language prompts  
📊 **Smart Dependency Tracking**: Automatic task sequencing and blocker detection  
⚡ **NPX Ready**: Zero-installation deployment with `npx @croffasia/mcp-project-manager`  
🖥️ **Interactive CLI Dashboard**: Real-time project visualization and navigation  
🔄 **Status Management**: Pending → In-Progress → Done with progress tracking  
🛡️ **Approval Workflow**: User control over all AI actions and modifications  

## 🚀 Quick Start

### Prerequisites

- Any MCP-compatible tool (see supported tools below)
- Node.js 18+ (includes NPX automatically)

## 📁 Data Storage

**Important:** Understanding where your task data is stored:

- **Without `MCP_TASK_DATA_DIR`**: Data stored in current project directory
  where AI is working
- **With `MCP_TASK_DATA_DIR`**: Data stored in specified absolute path

### When to use each approach:

**✅ Use current directory (no `MCP_TASK_DATA_DIR`):**

- Working on a specific project
- Want task data alongside your code
- Using Cursor, VS Code, or other project-based tools

**✅ Use custom directory (`MCP_TASK_DATA_DIR`):**

- **Required** for Claude Desktop (read-only environment)
- Managing multiple projects centrally
- Want shared task management location

## 🚀 Installation Methods

### Method 1: NPX (Recommended)

Simply use `npx @croffasia/mcp-project-manager` in your MCP client configuration - NPX will
handle downloading and running the server for you.

### Method 2: Clone Repository

For development or customization:

```bash
git clone https://github.com/croffasia/mcp-project-manager.git
cd mcp-project-manager
npm install
npm run build
```

## Configuration

This MCP server works with any MCP-compatible tool. Here are the most popular
options:

## Supported Tools

### 🔷 **Claude Code** (Recommended)

Add to your Claude Code configuration (CLAUDE.md or project settings):

```json
{
    "mcpServers": {
        "project-manager": {
            "command": "npx",
            "args": ["@croffasia/mcp-project-manager"]
        }
    }
}
```

_Add `"env": {"MCP_TASK_DATA_DIR": "/path/to/your/project"}` if you need custom
data directory._

### 🟦 **Claude Desktop**

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**⚠️ Required for Claude Desktop:** You must specify a writable directory using
`MCP_TASK_DATA_DIR` because Claude Desktop runs in a read-only environment.

**Option 1: Project-specific (Recommended)** Store task data in your project
folder:

```json
{
    "mcpServers": {
        "project-manager": {
            "command": "npx",
            "args": ["@croffasia/mcp-project-manager"],
            "env": {
                "MCP_TASK_DATA_DIR": "/Users/yourusername/projects/my-app"
            }
        }
    }
}
```

**Option 2: Shared location** Store all task data in one central location:

```json
{
    "mcpServers": {
        "project-manager": {
            "command": "npx",
            "args": ["@croffasia/mcp-project-manager"],
            "env": {
                "MCP_TASK_DATA_DIR": "/Users/yourusername/Documents/task-management"
            }
        }
    }
}
```

**Examples of good directories:**

- **Project folder**: `/Users/yourusername/projects/my-app`
- **Central location**: `/Users/yourusername/Documents/task-management`
- **Windows project**: `C:\\Users\\yourusername\\projects\\my-app`
- **Windows central**: `C:\\Users\\yourusername\\Documents\\task-management`

### 🔵 **Cursor**

Add to Cursor settings (`File > Preferences > Settings > Extensions > MCP`):

```json
{
    "mcp": {
        "servers": {
            "project-manager": {
                "command": "npx",
                "args": ["@croffasia/mcp-project-manager"]
            }
        }
    }
}
```

_Add `"env": {"MCP_TASK_DATA_DIR": "/path/to/your/project"}` if you need custom
data directory._

### 🟢 **VS Code** (Preview)

With GitHub Copilot extension and Agent mode enabled:

```json
{
    "github.copilot.chat.mcp.servers": {
        "project-manager": {
            "command": "npx",
            "args": ["@croffasia/mcp-project-manager"]
        }
    }
}
```

_Add `"env": {"MCP_TASK_DATA_DIR": "/path/to/your/project"}` if you need custom
data directory._

### 🟡 **Continue.dev**

Add to Continue config (`.continue/config.json`):

```json
{
    "mcpServers": {
        "project-manager": {
            "command": "npx",
            "args": ["@croffasia/mcp-project-manager"]
        }
    }
}
```

_Add `"env": {"MCP_TASK_DATA_DIR": "/path/to/your/project"}` if you need custom
data directory._

### 🟣 **Other MCP-Compatible Tools**

- **Windsurf** - AI-powered development environment
- **Zed** - High-performance code editor with AI features
- **Cline** - AI coding assistant
- **Any custom MCP client** following the protocol

## Local Development Setup

If you cloned the repository (Method 2), update your MCP client config:

**Using built version:**

```json
{
    "mcpServers": {
        "project-manager": {
            "command": "node",
            "args": ["/absolute/path/to/mcp-project-manager/dist/index.js"]
        }
    }
}
```

**With custom data directory:**

```json
{
    "mcpServers": {
        "project-manager": {
            "command": "node",
            "args": ["/absolute/path/to/mcp-project-manager/dist/index.js"],
            "env": {
                "MCP_TASK_DATA_DIR": "/path/to/your/project"
            }
        }
    }
}
```

## For Developers

### Prerequisites

- Node.js 18+
- TypeScript
- MCP SDK knowledge
- Any MCP-compatible development environment

### Installation

```bash
git clone https://github.com/croffasia/mcp-project-manager.git
cd mcp-project-manager
npm install
```

### Development

```bash
npm run dev    # Watch mode
npm run build  # Build for production
npm run test   # Run tests
```

## 🖥️ CLI Dashboard

- **Interactive Task Browser**: Terminal-based interface for task management
- **Real-time Updates**: Auto-refresh capabilities with customizable intervals
- **Hierarchical Navigation**: Browse through projects → ideas → epics → tasks
- **Task Details View**: Detailed task information with progress tracking

### Parameters

- **Task Types**: `task`, `bug`, `rnd` (research)
- **Statuses**: `pending`, `in-progress`, `done`, `blocked`, `deferred`
- **Priorities**: `low`, `medium`, `high`

## Example Usage

### Project Setup

```
User: "Initialize project management"
Claude: Creates .product-task/ structure with counters and config
```

### Creating Work Items

```
User: "Create idea 'User Authentication System'"
Claude: Creates IDEA-1 with proper structure

User: "Break down this idea into epics"
Claude: Analyzes and creates: Login API, Frontend Integration, Security
```

### Task Management

```
User: "Give me the next high priority task"
Claude: Returns optimal task based on dependencies and priority

User: "Update task TSK-5 status to in-progress"
Claude: Updates status and logs progress
```

### CLI Dashboard Usage

**With NPX:**

```bash
npx @croffasia/mcp-project-manager --dashboard
npx @croffasia/mcp-project-manager --dashboard --refresh=60
```

**With local installation:**

```bash
npm run dashboard
```

**Navigation:**

- Use ↑/↓ to navigate lists
- Press Enter to select items
- Use Backspace to go back
- Press 'q' to quit

### Analysis

```
User: "Analyze complexity of task TSK-3"
Claude: Provides detailed complexity assessment with recommendations
```

## Architecture

The server uses a hierarchical structure:

- **Ideas** (IDEA-N): High-level features
- **Epics** (EPIC-N): Implementation phases
- **Tasks** (TSK-N): Specific development work
- **Bugs** (BUG-N): Bug fixes
- **Research** (RND-N): Investigation tasks

Data is stored in SQLite database for reliable and efficient task management.

## Advanced Configuration

### Database Storage

Data is stored in SQLite database (`database.sqlite`) within the data directory.

### Global Project Registry

The MCP Project Manager automatically maintains a global registry of all
projects where it's used. This registry is stored in:

- **MacOS/Linux:** `~/.mcp-project-manager/registry.json`
- **Windows:** `%USERPROFILE%\.mcp-project-manager\registry.json`

The registry tracks:

- Project names and absolute paths
- Database locations for each project
- Usage statistics (last used, usage count)
- Project creation dates

This happens automatically - no configuration needed. The registry enables
future features like project switching and usage analytics.

### ID Prefixes

Customize ID prefixes in `project-config.json`:

```json
{
    "prefixes": {
        "idea": "FEAT",
        "epic": "EPIC",
        "task": "TSK",
        "bug": "BUG",
        "rnd": "RND"
    }
}
```

### Environment Variables

- `MCP_TASK_DATA_DIR` - Custom directory for storing task data
    - **Required** for Claude Desktop (read-only environment)
    - **Optional** for other tools (defaults to current directory)

## 🌟 Contributing & Support

⭐ **Star this repository** if you find it useful!  
🐛 **Report issues** on our [GitHub Issues](https://github.com/croffasia/mcp-project-manager/issues)  
🤝 **Contribute** by submitting pull requests  
📖 **Share** with other developers who use MCP-compatible AI tools  

## 📄 License

MIT © 2025 [Andrii Poluosmak](https://github.com/croffasia)
