# 👻 BrowseHand

AI Agent that directly controls your local browser.

## 🎯 Key Features

- **Real-time Browser Control**: AI (Claude) reads and manipulates data from the active tab.
- **Session Persistence**: Uses your existing logged-in browser sessions.
- **Local File Storage**: Saves scraped data directly to your local machine as CSV or JSON.
- **Bot Detection Bypass**: Uses your real browser, bypassing automation detection.
- **Structured Data Extraction**: Automatically parses list data using CSS selectors.

## 🏗️ System Architecture

```
User/Claude → MCP Server (localhost:8765) ↔ Chrome Extension → Active Tab
```

## 🛠️ Available Tools (MCP Tools)

| Tool | Description |
|------|-------------|
| `read_browser_content` | Read text content from current tab |
| `execute_script` | Execute JavaScript code |
| `extract_structured_data` | Extract structured data from repeating elements |
| `click_element` | Click element by CSS selector |
| `scroll_page` | Scroll page (up/down/top/bottom) |
| `wait_for_element` | Wait for specific element to appear |
| `navigate_to` | Navigate to specific URL |
| `get_current_url` | Get current URL |
| `save_to_csv` | Save data to CSV file |
| `save_to_json` | Save data to JSON file |
| `ping_extension` | Check extension connection status |

## 🚀 Installation & Usage

### 1. Install MCP Server

```bash
cd mcp-server
npm install
npm start
```

Server listens on `ws://localhost:8765`.

### 2. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in top right
3. Click "Load unpacked"
4. Select `chrome-extension` folder

### 3. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browsehand": {
      "command": "node",
      "args": ["/Users/indo/code/project/browsehand/mcp-server/index.js"]
    }
  }
}
```

## 📖 Usage Examples

### Basic Usage
```
"Read the title of the current page"
"Check extension connection status"
```

### Data Extraction & Storage
```
"Extract .name and .price inside .item class from current page and save to products.csv"
```

### Automation Workflow
```
"Search for 'Gangnam Cafe' on Google Maps, scroll to collect 50 businesses, and save to CSV"
```

## 🛠️ Development Roadmap

### Phase 1: Communication Pipeline ✅
- [x] WebSocket Server
- [x] Chrome Extension Basic Structure
- [x] MCP Tools Definition (ping, read, execute)

### Phase 2: Scraping Features ✅
- [x] Page Scrolling Automation
- [x] Element Click Automation
- [x] Wait Logic (wait_for_element)
- [x] Structured Data Extraction
- [x] CSV/JSON Save
- [x] URL Navigation

### Phase 3: Advanced Automation (Planned)
- [ ] Form Auto-fill
- [ ] Captcha Detection & Alert
- [ ] Multi-tab Support
- [ ] Scheduling

## 🔧 Tech Stack

- **MCP Server**: Node.js, @modelcontextprotocol/sdk, ws
- **Chrome Extension**: Manifest V3, WebSocket Client
- **Communication**: WebSocket (Bi-directional Real-time)

## 📁 Project Structure

```
browsehand/
├── mcp-server/
│   ├── index.js          # MCP Server + WebSocket Server
│   └── package.json
├── chrome-extension/
│   ├── manifest.json     # Extension Config
│   ├── background.js     # WebSocket Client
│   ├── content.js        # DOM Manipulation Script
│   ├── popup.html        # Popup UI
│   └── popup.js
├── test-page.html        # Local Test Page
├── QUICKSTART.md         # Quick Start Guide
├── TESTING_GUIDE.md      # Testing Guide
└── README.md
```

## ⚠️ Important Notes

- MCP Server must be running for the extension to work.
- Works on localhost only; no external access.
- Be careful with security as it uses your browser session.
- Comply with website terms of service.

## 📝 License

MIT
