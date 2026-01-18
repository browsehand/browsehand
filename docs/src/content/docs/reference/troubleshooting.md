---
title: Troubleshooting
description: Common issues and solutions when using BrowseHand.
---

## Connection Issues

### "Chrome Extension is not connected"

**Symptom**: Running tools from Claude returns "Extension not connected" error

**Solutions**:

1. **Verify MCP server is running**
   ```bash
   cd /Users/indo/code/project/phantom-agent/mcp-server
   npm start
   ```
   
2. **Check extension installation**
   - Go to `chrome://extensions/` and verify BrowseHand is enabled
   
3. **Check browser console**
   - Open any page, press F12 → Console tab
   - Look for `[BrowseHand] ✅ Connected to MCP server` message
   
4. **Reload extension**
   - Go to `chrome://extensions/` and click BrowseHand's refresh button

### "Receiving end does not exist" error

**Symptom**: Console shows "Could not establish connection. Receiving end does not exist"

**Cause**: Tab was refreshed or extension restarted, breaking the connection

**Solution**:
1. **Refresh the current tab** (F5 or Cmd+R)
2. Click the extension icon for guidance message

---

## Server Issues

### Port 8765 already in use

**Symptom**: "EADDRINUSE" error when starting server

**Solution**:
```bash
# Kill existing process
lsof -ti:8765 | xargs kill -9

# Restart
cd /Users/indo/code/project/phantom-agent/mcp-server
npm start
```

### MCP server not recognized by Claude Desktop

**Symptom**: BrowseHand tools not visible in Claude Desktop

**Solutions**:

1. **Check config file**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   
2. **Verify JSON syntax** — Check for proper commas, quotes, etc.
   
3. **Verify path** — Ensure `/Users/indo/code/project/phantom-agent/mcp-server/index.js` exists

4. **Fully restart Claude Desktop**
   - Menu bar → Claude → Quit Claude
   - Relaunch

---

## Tool Execution Issues

### "Element not found"

**Symptom**: `click_element`, `wait_for_element`, etc. cannot find the element

**Solutions**:

1. **Wait for page load**
   ```text
   First use wait_for_element to wait for the element to appear
   ```

2. **Verify selector**
   - Open Developer Tools (F12) and verify the selector
   - Test in Console: `document.querySelector("your_selector")`

3. **Watch for dynamic class names**
   - Some sites (Google Maps, etc.) change class names per build
   - Use `execute_script` to analyze page structure first

### CSV file not created

**Symptom**: `save_to_csv` runs but no file appears

**Solutions**:

1. **Check MCP server logs** — Look for error messages in terminal

2. **Verify save path**
   - Default location: `/Users/indo/code/project/phantom-agent/`
   - You can specify absolute path for filename

3. **Check data**
   - Empty array won't create a file
   - Verify `extract_structured_data` results first

---

## Scrolling Issues

### Only the entire page scrolls on Google Maps

**Symptom**: The map scrolls instead of the sidebar list

**Solution**:

Use the `selector` option in `scroll_page`:

```text
Use scroll_page to scroll only the div[role="feed"] area downward
```

### Infinite scroll not working

**Symptom**: Scrolling doesn't load new data

**Solutions**:

1. **Wait after scrolling**
   ```text
   After scroll_page, use wait_for_element to wait about 2 seconds for new items
   ```

2. **Verify scroll target**
   - Ensure you're targeting the correct scrollable container
   - Look for elements with `overflow: auto` or `overflow: scroll` style

---

## Icon Warnings

**Symptom**: Extension shows icon-related warnings

**Note**: Missing icons don't affect functionality — **everything works normally**.

To remove warnings, copy any PNG images to the `chrome-extension/` folder:
```bash
cd /Users/indo/code/project/phantom-agent/chrome-extension
# Need 16x16, 48x48, 128x128 PNG files
```

---

## Getting Help

If the above solutions don't resolve your issue:

1. **Copy MCP server logs** from terminal
2. **Copy browser console logs** (F12 → Console)
3. **Document reproduction steps**

Submit with this information to GitHub Issues.
