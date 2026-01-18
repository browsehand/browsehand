---
title: Usage Scenarios
description: Real-world automation scenarios and smart prompts for BrowseHand.
---

## Scenario Overview

| Scenario | Feasibility | Notes |
| :--- | :---: | :--- |
| **1. Google Maps Bulk Scraping** | ✅ **Yes** | Sidebar scroll feature enables full data collection |
| **2. KakaoTalk Simple Auth** | ✅ **Yes** | Can click "Request Auth" button (mobile approval required by user) |
| **3. DART Report Analysis** | ✅ **Yes** | Can extract text from web viewer |
| **4. Certificate Login (Korea)** | ❌ **No** | Cannot control external processes (EXE/ActiveX) |

---

## Smart Prompts

Copy-paste prompts that handle complex tasks without requiring CSS selector knowledge.
Just paste these directly to Claude.

### Google Maps Business Scraping — Universal Prompt

:::tip[Copy and use directly]
Google Maps class names change frequently. This prompt instructs Claude to analyze the current page structure and find the correct selectors automatically.
:::

```text
I have Google Maps search results open.
First, use execute_script to analyze the page structure and identify:
- The business list container (usually a div with role="feed")
- Selectors for business name, rating, review count, and address

Then:
1. Use scroll_page with the selector option to scroll only the sidebar (not the whole page)
2. After each scroll, use wait_for_element to wait for new items to load
3. Repeat scroll → wait → extract until at least 30 businesses are collected
4. Save the collected data to google_maps_results.csv

Important: Google Maps uses dynamically generated class names (e.g., .qBF1Pd, .MW4etd).
Always verify the current selectors with execute_script before scraping.
```

### Naver Maps Business Scraping — Universal Prompt

```text
I have Naver Maps search results open.
Use execute_script to analyze the page structure and identify the business list selectors.

Naver Maps typically uses:
- List container: #_pcmap_list_scroll_container or similar ID
- Business card: .CHC5F or similar class
- Business name: .TYaxT or similar class

After analysis:
1. Use scroll_page(selector: "container_selector", direction: "down") on the scroll container
2. Use wait_for_element to wait for new items to load
3. Repeat until 30+ items are collected
4. Save to naver_maps_results.csv

Selectors may differ from expected — verify page structure first.
```

### Generic List Page — Universal Prompt

```text
I want to scrape repeating list items from the current page.

First, use execute_script to analyze the page and find:
1. The common parent container selector for repeating items
2. Selectors for title, description, link within each item

Then use extract_structured_data with:
- containerSelector: selector for individual items
- fields: { title: "title_selector", description: "desc_selector", link: "link_selector" }

If needed, scroll to load more items and save to CSV.
```

---

## 1. Google Maps Bulk Scraping

The most powerful use case. If logged in, you can also scrape personalized search results.

### Goal

Scrape 50 "Gangnam cafe" search results with scrolling and save to `cafes.csv`.

### Example Prompt

```text
Search for "Gangnam cafe" on Google Maps (google.com/maps).
Then scroll the left sidebar (div[role="feed"]) and extract:
- Business name (.qBF1Pd)
- Rating (.MW4etd)
- Address (.W4Efsd)
Collect 50 items and save to gangnam_cafes.csv.
```

### Technical Notes

- **Container-specific scrolling**: Use the `selector` option in `scroll_page` to scroll only the sidebar.
- **Selector**: Google Maps list container typically has `div[role="feed"]` attribute.

:::caution[Google Maps Selector Warning]
CSS class names like `.qBF1Pd`, `.MW4etd` **change between builds**.
Use the **Universal Prompt** above to let Claude detect current class names.
:::

---

## 2. KakaoTalk Simple Authentication

Useful for government sites (Korea) that require simple authentication.

### Goal

Enter name, birth date, phone number on the login page and click "Request Authentication".

### Example Prompt

```text
On the current tax office login page, select KakaoTalk simple authentication.
Enter name: "Hong Gildong", birth date: "19900101", phone: "01012345678"
Check "Agree to all" and click the "Request Authentication" button.
```

### Notes

- **Mobile approval required**: PC browser can only request authentication. Actual approval must be done on the smartphone KakaoTalk app.
- **CAPTCHA**: If security images appear, automation becomes difficult.

---

## 3. DART Report Analysis (Korea)

Let AI read massive reports from the Financial Supervisory Service electronic disclosure system (dart.fss.or.kr).

### Goal

Open Samsung Electronics business report and summarize the "Management Discussion & Analysis" chapter.

### Example Prompt

```text
Open Samsung Electronics' latest business report on DART.
Click "IV. Management Discussion & Analysis" in the left table of contents.
Read the content using read_browser_content and summarize the key points.
```

### Technical Notes

- **iFrame handling**: DART viewer may have content inside an `iframe`. If `read_browser_content` can't access iframe content, navigate directly to the frame's URL using `navigate_to`.

---

## 4. Certificate Login (Limitations)

### Why It's Not Possible

Korean legacy certificate (공동인증서) windows are **not HTML rendered by Chrome**.
They are **Windows application windows (EXE)** launched by security plugins like AnySign4PC.

BrowseHand can only control **browser DOM** — it cannot click or type into windows outside the browser.

### Alternatives

- **Browser certificates**: If the site supports cloud-based browser certificates instead of local disk certificates, it may work.
- **Simple authentication**: KakaoTalk, PASS, Naver authentication use web-based UI and are controllable. (See Scenario 2)
