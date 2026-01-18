# 🧪 BrowseHand Testing Guide

## 1. Local Test (test-page.html)

### Preparation
```bash
# Start MCP Server
cd /Users/indo/code/project/phantom-agent/mcp-server
npm start

# Open Test Page
open /Users/indo/code/project/phantom-agent/test-page.html
```

### Test Scenarios

#### A. Structured Data Extraction Test
```json
{
  "tool": "extract_structured_data",
  "containerSelector": ".business-item",
  "fields": {
    "name": ".business-name",
    "phone": ".business-phone",
    "address": ".business-address"
  }
}
```

**Expected Result:**
```json
[
  { "name": "Delicious Kimbap Heaven", "phone": "📞 02-1234-5678", "address": "📍 123 Teheran-ro, Gangnam-gu, Seoul" },
  { "name": "Happy Cafe", "phone": "📞 02-2345-6789", "address": "📍 456 Seocho-daero, Seocho-gu, Seoul" },
  ...
]
```

#### B. Scroll Test
```json
{
  "tool": "scroll_page",
  "direction": "bottom"
}
```

#### C. Click Test
```json
{
  "tool": "click_element",
  "selector": "#click-btn"
}
```

#### D. CSV Save Test
```json
{
  "tool": "save_to_csv",
  "filename": "test_leads.csv",
  "data": [
    { "name": "Test Business", "phone": "010-0000-0000" }
  ]
}
```

---

## 2. Real Website Test

### Google Maps

#### Step 1: Search
1. Go to `https://www.google.com/maps` in Chrome
2. Search for "Gangnam Cafe"
3. Wait for list to appear on left

#### Step 2: Verify Selectors (DevTools)
```javascript
// Business List Container
document.querySelectorAll('[data-index]')

// Business Name
document.querySelector('.fontHeadlineSmall')

// Rating
document.querySelector('.MW4etd')

// Address
document.querySelector('.W4Efsd')
```

#### Step 3: Extraction Command (in Claude Desktop)
```
"Extract current visible business list from Google Maps.
Container: '[data-index]', 
Fields: name: '.fontHeadlineSmall', rating: '.MW4etd', address: '.W4Efsd'
Save result to google_maps_cafes.csv"
```

### Naver Maps

#### Step 1: Search
1. Go to `https://map.naver.com` in Chrome
2. Search for "Gangnam Restaurant"
3. List appears in left panel

#### Step 2: Verify Selectors
```javascript
// Business List Item
document.querySelectorAll('.CHC5F')

// Business Name
document.querySelector('.TYaxT')

// Category
document.querySelector('.KCMnt')
```

### Notes

1. **Selectors may change**: Google/Naver update UIs frequently. Use DevTools to verify current structure.
2. **Scroll wait required**: For infinite scroll sites, use `wait_for_element` after `scroll_page` to wait for new data.
3. **Use login session**: Logged-in state (e.g., Naver) may show more info (phone numbers, etc.).

---

## 3. Claude Desktop Configuration

### claude_desktop_config.json

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

**Config File Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Restart Claude Desktop after configuration

---

## 4. Troubleshooting

### "Chrome Extension not connected"
1. Check if extension is installed (`chrome://extensions/`)
2. Check if MCP server is running
3. Check browser console for `[BrowseHand] ✅ Connected` message

### "Element not found"
1. Ensure page is fully loaded
2. Verify selector with DevTools
3. Try `wait_for_element` before action

### CSV file not created
1. Check MCP server logs for errors
2. Check write permissions for path
3. Check if data is empty array

---

## 5. Full Workflow Example

### "Collect 50 Gangnam Cafes from Google Maps"

```
1. navigate_to("https://www.google.com/maps/search/Gangnam+Cafe")
2. wait_for_element("[data-index]", timeout=10000)
3. Loop:
   a. extract_structured_data(...)
   b. scroll_page("down", 500)
   c. wait_for_element("[data-index]:last-child")
4. save_to_csv("gangnam_cafes.csv", collected_data)
```

Ask Claude in natural language to execute this workflow using available tools.
