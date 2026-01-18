---
title: Quick Start Guide
description: Install BrowseHand and run your first command in 5 minutes.
---

## Prerequisites

- Node.js 18 or higher
- Chrome browser
- Claude Desktop (optional)

---

## Step 1: Start the MCP Server

```bash
cd /Users/indo/code/project/phantom-agent/mcp-server
npm install
npm start
```

**Expected output:**
```
[MCP] Starting BrowseHand MCP Server...
[MCP] WebSocket server listening on ws://localhost:8765
[MCP] MCP Server ready. Waiting for Chrome Extension connection...
```

:::tip[Server won't start?]
Port 8765 might already be in use.
```bash
lsof -ti:8765 | xargs kill -9
npm start
```
:::

---

## Step 2: Install Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** in the top right corner
3. Click **"Load unpacked"**
4. Select the `/Users/indo/code/project/phantom-agent/chrome-extension` folder

### Verify Installation

- **"BrowseHand"** should appear in your extensions list
- Open any webpage, press F12 to open Console, and look for:

```
[BrowseHand] ✅ Connected to MCP server
```

---

## Step 3: Open the Test Page

```bash
open /Users/indo/code/project/phantom-agent/test-page.html
```

Or open the file directly in your browser.

---

## Step 4: Configure Claude Desktop

To integrate with Claude Desktop, edit the configuration file.

### Config File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "browsehand": {
      "command": "node",
      "args": ["/Users/indo/code/project/phantom-agent/mcp-server/index.js"]
    }
  }
}
```

:::caution[Important]
You must **completely quit and restart Claude Desktop** after editing the config.
:::

---

## Step 5: Run Your First Command

With the test page open, ask Claude:

### Check Connection Status

```
Use the ping_extension tool to check the extension connection status
```

### Read Page Content

```
Use read_browser_content to read the current page content
```

### Execute JavaScript

```
Use execute_script to run document.title
```

---

## Next Steps

Congratulations! Basic setup is complete.

- [Usage Scenarios](/guides/scenarios/) — Google Maps scraping, authentication automation, and more
- [MCP Tools](/reference/tools/) — All available tools and their parameters
- [Troubleshooting](/reference/troubleshooting/) — Common issues and solutions
