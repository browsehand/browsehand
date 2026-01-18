# 🎭 BrowseHand Usage Scenarios

This document covers real-world automation scenarios using BrowseHand.

## 📌 Scenario Overview

| Scenario | Feasibility | Notes |
| :--- | :---: | :--- |
| **1. Google Maps Bulk Scraping** | ✅ **Yes** | Sidebar scroll feature enables full data collection |
| **2. KakaoTalk Simple Auth** | ✅ **Yes** | Can click "Request Auth" button (mobile approval required by user) |
| **3. DART Report Analysis** | ✅ **Yes** | Can extract text from web viewer |
| **4. Certificate Login (Korea)** | ❌ **No** | Cannot control external processes (EXE/ActiveX) |

---

## 1. Google Maps Bulk Scraping

The most powerful use case. If logged in, you can also scrape personalized search results.

### 🎯 Goal
Scrape 50 "Gangnam cafe" search results with scrolling and save to `cafes.csv`.

### 📝 Example Prompt
```text
Search for "Gangnam cafe" on Google Maps (google.com/maps).
Then scroll the left sidebar (div[role="feed"]) and extract:
- Business name (.qBF1Pd)
- Rating (.MW4etd)
- Address (.W4Efsd)
Collect 50 items and save to gangnam_cafes.csv.
```

### 💡 Technical Notes
- **Container-specific scrolling**: Use the `selector` option in `scroll_page` to scroll only the sidebar.
- **Selector**: Google Maps list container typically has `div[role="feed"]` attribute.

---

## 2. KakaoTalk Simple Authentication

Useful for government sites (Korea) that require simple authentication.

### 🎯 Goal
Enter name, birth date, phone number on the login page and click "Request Authentication".

### 📝 Example Prompt
```text
On the current tax office login page, select KakaoTalk simple authentication.
Enter name: "Hong Gildong", birth date: "19900101", phone: "01012345678"
Check "Agree to all" and click the "Request Authentication" button.
```

### ⚠️ Notes
- **Mobile approval required**: PC browser can only request authentication. Actual approval must be done on the smartphone KakaoTalk app.
- **CAPTCHA**: If security images appear, automation becomes difficult.

---

## 3. DART Report Analysis (Korea)

Let AI read massive reports from the Financial Supervisory Service electronic disclosure system (dart.fss.or.kr).

### 🎯 Goal
Open Samsung Electronics business report and summarize the "Management Discussion & Analysis" chapter.

### 📝 Example Prompt
```text
Open Samsung Electronics' latest business report on DART.
Click "IV. Management Discussion & Analysis" in the left table of contents.
Read the content using read_browser_content and summarize the key points.
```

### 💡 Technical Notes
- **iFrame handling**: DART viewer may have content inside an `iframe`. If `read_browser_content` can't access iframe content, navigate directly to the frame's URL using `navigate_to`.

---

## 4. Certificate Login (Limitations)

### 🚫 Why It's Not Possible
Korean legacy certificate (공동인증서) windows are **not HTML rendered by Chrome**.
They are **Windows application windows (EXE)** launched by security plugins like AnySign4PC.

BrowseHand can only control **browser DOM** — it cannot click or type into windows outside the browser.

### ✅ Alternatives
- **Browser certificates**: If the site supports cloud-based browser certificates instead of local disk certificates, it may work.
- **Simple authentication**: KakaoTalk, PASS, Naver authentication use web-based UI and are controllable. (See Scenario 2)
