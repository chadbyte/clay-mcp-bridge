# clay-mcp-bridge

Native Messaging Host for the [Clay](https://github.com/chadbyte/clay) Chrome Extension. Bridges local MCP (Model Context Protocol) servers to Clay running on a remote machine.

## When do I need this?

If you access Clay from a **remote server** (not localhost), this bridge lets your Mates use MCP servers running on your local machine (GitHub, Notion, Slack, databases, etc.).

If Clay runs on **localhost**, you don't need this. Clay manages MCP processes directly.

## Install

```bash
npx clay-mcp-bridge install <extension-id>
```

Find your extension ID at `chrome://extensions` (look for "Clay").

Supports Chrome, Arc, and Chromium on macOS and Linux. No sudo required.

## Uninstall

```bash
npx clay-mcp-bridge uninstall
```

## How it works

```
Clay Server (remote)
  |  WebSocket
Clay Webapp (your browser)
  |  window.postMessage
Chrome Extension (content script + service worker)
  |  Chrome Native Messaging
clay-mcp-bridge (this package, on your machine)
  |  stdin/stdout
MCP Server processes (GitHub, Notion, etc.)
```

The bridge reads your MCP config from `~/.clay/mcp.json`, spawns stdio-based MCP server processes, and relays JSON-RPC messages between the Chrome Extension and those processes.

## Config

The bridge uses `~/.clay/mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_xxx" }
    }
  },
  "include": [
    "~/.claude/claude_desktop_config.json"
  ]
}
```

You can manage this config from the Clay Chrome Extension popup (add/remove servers, import existing configs).

The `include` array merges servers from other config files (Claude Desktop, Cursor, etc.) so you don't have to duplicate settings.

## Requirements

- Node.js 18+
- Clay Chrome Extension installed
- A Chromium-based browser (Chrome, Arc, Chromium)

## License

MIT
