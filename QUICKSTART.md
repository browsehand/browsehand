# 🚀 Quick Start Guide

## Step 1: Run MCP Server

```bash
cd /Users/indo/code/project/phantom-agent/mcp-server
npm install
npm start
```

**Expected Output:**
```
[MCP] Starting BrowseHand MCP Server...
[MCP] WebSocket server listening on ws://localhost:8765
[MCP] MCP Server ready. Waiting for Chrome Extension connection...
```

## Step 2: Install Chrome Extension

1. Open Chrome browser
2. Enter `chrome://extensions/` in address bar
3. Enable **"Developer mode"** toggle in top right
4. Click **"Load unpacked"**
5. Select `/Users/indo/code/project/phantom-agent/chrome-extension` folder

**Verification:**
- "BrowseHand" appears in extension list
- Check browser console (F12) for `[BrowseHand] ✅ Connected to MCP server`

## Step 3: Open Test Page

```bash
open /Users/indo/code/project/phantom-agent/test-page.html
```

Or open the file directly in browser.

## Step 4: Configure Claude Desktop (Optional)

To integrate with Claude Desktop:

```bash
# Open config file
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add the following:

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

Restart Claude Desktop to apply changes.

## Step 5: Test

### Test directly in Browser Console

1. Open test page
2. Press F12 to open Developer Tools
3. Check Console tab:

```javascript
// Check MCP Server connection
// Should see: [BrowseHand] ✅ Connected to MCP server
```

### Test in Claude Desktop

With the test page open, ask Claude:

```
"Use ping_extension tool to check extension connection status"
```

```
"Use read_browser_content tool to read current page content"
```

```
"Use execute_script tool to run document.title"
```

## Troubleshooting

### Extension Not Connected

1. Check if MCP server is running
2. Check error messages in browser console
3. Reload extension: Click refresh button in `chrome://extensions/`

### MCP Server Error

```bash
# If port is already in use
lsof -ti:8765 | xargs kill -9

# Restart
npm start
```

### Icon Warning

The extension works fine without icon files. To remove warning:

```bash
cd chrome-extension
# Copy any PNG image
cp /path/to/any/image.png icon16.png
cp /path/to/any/image.png icon48.png
cp /path/to/any/image.png icon128.png
```

## Next Steps

Phase 1 Complete! You can now add:

- [ ] Automatic pagination handling
- [ ] Save data to CSV
- [ ] Extract data with specific selectors
- [ ] Click event automation

Refer to roadmap in `README.md` for further development.
