# 🚀 MCP Project Manager

[![GitHub stars](https://img.shields.io/github/stars/croffasia/mcp-project-manager?style=social)](https://github.com/croffasia/mcp-project-manager/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-orange.svg)](https://modelcontextprotocol.io)

**Hierarchical Task Management via Model Context Protocol (MCP)**

Transform any MCP-compatible AI assistant into a powerful project manager with automated task breakdown, dependency tracking, and smart workflow management.

**Compatible with:** Claude Code • Claude Desktop • Cursor • VS Code + Copilot • Continue.dev • Any MCP Client

## 📖 Documentation

- 📚 **[Complete User Guide](docs/README.md)** - Comprehensive setup and usage guide
- ⚙️ **[Tools Reference](docs/tools.md)** - Complete MCP tools documentation  
- 🎯 **[AI Prompts](docs/prompts.md)** - Ready-to-use prompts for task management

## ✨ Key Features

🎯 **Hierarchical Project Management**: Ideas → Epics → Tasks with intelligent decomposition  
🤖 **AI-Powered Task Creation**: Automated breakdown using natural language prompts  
📊 **Smart Dependency Tracking**: Automatic task sequencing and blocker detection  
⚡ **NPX Ready**: Zero-installation deployment with `npx mcp-project-manager`  
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

Simply use `npx mcp-project-manager` in your MCP client configuration - NPX will
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
        "pm": {
            "command": "npx",
            "args": ["mcp-project-manager"]
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
        "pm": {
            "command": "npx",
            "args": ["mcp-project-manager"],
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
        "pm": {
            "command": "npx",
            "args": ["mcp-project-manager"],
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

Add to Cursor MCP configuration:

**Global Configuration**: Create `~/.cursor/mcp.json`:
```json
{
    "mcpServers": {
        "pm": {
            "command": "npx",
            "args": ["mcp-project-manager"]
        }
    }
}
```

**Project-specific Configuration**: Create `.cursor/mcp.json` in your project:
```json
{
    "mcpServers": {
        "pm": {
            "command": "npx",
            "args": ["mcp-project-manager"],
            "env": {
                "MCP_TASK_DATA_DIR": "/path/to/your/project"
            }
        }
    }
}
```

### 🟢 **VS Code** (Preview)

With GitHub Copilot extension and Agent mode enabled:

**Workspace Configuration**: Create `.vscode/mcp.json` in your project:
```json
{
    "servers": {
        "pm": {
            "type": "stdio",
            "command": "npx",
            "args": ["mcp-project-manager"]
        }
    }
}
```

**With custom data directory**:
```json
{
    "servers": {
        "pm": {
            "type": "stdio",
            "command": "npx",
            "args": ["mcp-project-manager"],
            "env": {
                "MCP_TASK_DATA_DIR": "/path/to/your/project"
            }
        }
    }
}
```

### 🟡 **Continue.dev**

**Note**: MCP can only be used in **agent mode** in Continue.dev.

Create `.continue/mcpServers/pm.yaml` in your project:

```yaml
name: MCP Project Manager
version: 0.1.3
schema: v1
mcpServers:
  - name: Project Manager
    command: npx
    args:
      - "mcp-project-manager"
```

**With custom data directory**:
```yaml
name: MCP Project Manager
version: 0.1.3
schema: v1
mcpServers:
  - name: Project Manager
    command: npx
    args:
      - "mcp-project-manager"
    env:
      MCP_TASK_DATA_DIR: "/path/to/your/project"
```

### 🟣 **Other MCP-Compatible Tools**

- **Windsurf** - AI-powered development environment
- **Zed** - High-performance code editor with AI features
- **Cline** - AI coding assistant
- **Any custom MCP client** following the protocol

## Local Development Setup

If you cloned the repository (Method 2), update your MCP client config:

**For Claude Code/Desktop** (using built version):

```json
{
    "mcpServers": {
        "pm": {
            "command": "node",
            "args": ["/absolute/path/to/mcp-project-manager/dist/index.js"]
        }
    }
}
```

**For Cursor** (create `~/.cursor/mcp.json` or `.cursor/mcp.json`):

```json
{
    "mcpServers": {
        "pm": {
            "command": "node",
            "args": ["/absolute/path/to/mcp-project-manager/dist/index.js"]
        }
    }
}
```

**For VS Code** (create `.vscode/mcp.json`):

```json
{
    "servers": {
        "pm": {
            "type": "stdio",
            "command": "node",
            "args": ["/absolute/path/to/mcp-project-manager/dist/index.js"]
        }
    }
}
```

**For Continue.dev** (create `.continue/mcpServers/pm.yaml`):

```yaml
name: MCP Project Manager
version: 0.1.3
schema: v1
mcpServers:
  - name: Project Manager
    command: node
    args:
      - "/absolute/path/to/mcp-project-manager/dist/index.js"
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

Interactive terminal-based interface for task management with real-time updates and hierarchical navigation. Run with `npx mcp-project-manager --dashboard`.



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


### Environment Variables

- `MCP_TASK_DATA_DIR` - Custom directory for storing task data
    - **Required** for Claude Desktop (read-only environment)
    - **Optional** for other tools (defaults to current directory)

## 🌟 Contributing & Support

🐛 **Report issues** on our [GitHub Issues](https://github.com/croffasia/mcp-project-manager/issues)  
🤝 **Contribute** by submitting pull requests  
📖 **Share** with other developers who use MCP-compatible AI tools  

## 📄 License

MIT © 2025 [Andrii Poluosmak](https://github.com/croffasia)

---

### 🌟 Found this project useful?

If MCP Project Manager helped improve your AI-powered development workflow, please consider giving it a star! Your support helps us reach more developers and continue improving the project.

[![GitHub stars](https://img.shields.io/github/stars/croffasia/mcp-project-manager?style=social)](https://github.com/croffasia/mcp-project-manager/stargazers)

**Thank you for your support!** 🙏
