# BrowseHand

AI-powered browser automation MCP server for Claude Desktop.

## Installation

```bash
npx browsehand
```

Or install globally:

```bash
npm install -g browsehand
```

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "browsehand": {
      "command": "npx",
      "args": ["-y", "browsehand"]
    }
  }
}
```

## Requirements

- Chrome browser with BrowseHand extension installed
- Node.js 16+ (for npx)

## Links

- [Documentation](https://browsehand.dev)
- [Chrome Extension](https://chrome.google.com/webstore/detail/browsehand)
