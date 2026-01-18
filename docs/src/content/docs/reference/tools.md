---
title: MCP Tools Reference
description: Complete reference for all BrowseHand MCP tools and their parameters.
---

BrowseHand MCP server provides the following tools. When you make natural language requests to Claude Desktop, the appropriate tools are automatically invoked.

## Tool Summary

| Tool | Description |
|------|-------------|
| `ping_extension` | Check extension connection status |
| `read_browser_content` | Read text content from current tab |
| `execute_script` | Execute JavaScript code |
| `extract_structured_data` | Extract structured data from repeating elements |
| `click_element` | Click element by CSS selector |
| `scroll_page` | Scroll page or specific element |
| `wait_for_element` | Wait for element to appear |
| `navigate_to` | Navigate to a URL |
| `get_current_url` | Get current URL |
| `get_dom_snapshot` | Get DOM structure snapshot |
| `save_to_csv` | Save data to CSV file |
| `save_to_json` | Save data to JSON file |

---

## Connection

### ping_extension

Check the connection status with Chrome Extension.

**Parameters**: None

**Example**:
```text
Check the extension connection status
```

---

## Page Reading

### read_browser_content

Read HTML content from the currently active browser tab.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | string | ❌ | DOM selector to extract (default: `body`) |

**Examples**:
```text
Read the current page content
Read only the .main-content area using read_browser_content
```

### get_dom_snapshot

Get the DOM structure (main tags and text) for AI analysis.
Unnecessary tags (`script`, `style`, `noscript`, etc.) are automatically removed.

**Parameters**: None

**Example**:
```text
Analyze this page's DOM structure
```

### get_current_url

Get the current browser tab's URL.

**Parameters**: None

---

## Script Execution

### execute_script

Execute JavaScript code in the browser.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | ✅ | JavaScript code to execute |

**Examples**:
```text
Use execute_script to run document.title
Use execute_script to count all links on this page
```

:::tip[Page Analysis Use Case]
Useful for identifying current selectors on sites with dynamic class names (like Google Maps).
```text
Use execute_script to find the business list container selector
```
:::

---

## Data Extraction

### extract_structured_data

Extract structured data from repeating elements.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `containerSelector` | string | ✅ | Selector for each repeating item container (e.g., `.business-item`) |
| `fields` | object | ✅ | Field definitions. Key is field name, value is relative selector within container |
| `limit` | number | ❌ | Maximum items to extract (default: all) |

**Example**:
```text
Use extract_structured_data on .product-card with fields:
{ title: '.product-name', price: '.product-price', link: 'a' }
```

**Result Example**:
```json
[
  { "title": "Product A", "price": "$10.00", "link": "/product/1" },
  { "title": "Product B", "price": "$20.00", "link": "/product/2" }
]
```

---

## Page Manipulation

### click_element

Click an element by CSS selector.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | string | ✅ | CSS selector of element to click |
| `waitAfter` | number | ❌ | Milliseconds to wait after click (default: 1000) |

**Examples**:
```text
Click the .next-button
Use click_element to click #submit-btn and wait 2 seconds
```

### scroll_page

Scroll the browser page or a specific element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | string | ❌ | **CSS selector of element to scroll** (scrolls entire page if not specified) |
| `direction` | string | ✅ | Scroll direction: `down`, `up`, `bottom`, `top` |
| `amount` | number | ❌ | Pixels to scroll (only used with `down`/`up`) |

:::caution[selector Option (Important)]
To scroll only the sidebar on **Google Maps, Naver Maps**, etc., you MUST use the `selector` option.

```text
// Scroll entire page (default)
scroll_page direction: "down"

// Scroll only specific container (Google Maps sidebar)
scroll_page selector: "div[role='feed']" direction: "down"
```

Without specifying `selector`, the entire map scrolls and the list won't load new items.
:::

**Examples**:
```text
Scroll to the bottom of the page
Use scroll_page to scroll div[role="feed"] down by 500 pixels
```

### wait_for_element

Wait until a specific element appears.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `selector` | string | ✅ | CSS selector of element to wait for |
| `timeout` | number | ❌ | Maximum wait time in milliseconds (default: 10000) |

**Examples**:
```text
Wait until .loading disappears
Use wait_for_element to wait for .results to appear with 5 second timeout
```

### navigate_to

Navigate the browser to a specific URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | URL to navigate to |

**Examples**:
```text
Go to Google Maps
Use navigate_to to go to https://www.google.com/maps
```

---

## File Storage

### save_to_csv

Save data to a CSV file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filename` | string | ✅ | Filename to save (e.g., `leads.csv`) |
| `data` | array | ✅ | Array of data to save. Each item must be an object |
| `append` | boolean | ❌ | If `true`, append to existing file; if `false`, overwrite (default: `false`) |

**Save Location**: If no path is specified, files are saved to the **Desktop**.

**Examples**:
```text
Save the extracted data to cafes.csv
Use save_to_csv to append data to results.csv (append: true)
```

### save_to_json

Save data to a JSON file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filename` | string | ✅ | Filename to save (e.g., `data.json`) |
| `data` | object/array | ✅ | Data to save |

**Example**:
```text
Save the extracted data to results.json
```

---

## Workflow Example

### Scraping Data from Google Maps

```text
1. navigate_to("https://www.google.com/maps/search/gangnam+cafe")
2. wait_for_element("[data-index]", timeout=10000)
3. Loop:
   a. extract_structured_data(containerSelector="[data-index]", fields={...})
   b. scroll_page(selector="div[role='feed']", direction="down", amount=500)
   c. wait_for_element("[data-index]:last-child")
4. save_to_csv("gangnam_cafes.csv", collected_data)
```

As a natural language request to Claude:

```text
Scrape "Gangnam cafe" search results from Google Maps.
Scroll to collect 30 business listings and save to CSV.
Make sure to scroll only the sidebar (selector: div[role="feed"]).
```
