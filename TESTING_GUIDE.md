# 🧪 Phantom Agent 테스트 가이드

## 1. 로컬 테스트 (test-page.html)

### 준비
```bash
# MCP 서버 실행
cd /Users/indo/code/project/phantom-agent/mcp-server
npm start

# 테스트 페이지 열기
open /Users/indo/code/project/phantom-agent/test-page.html
```

### 테스트 시나리오

#### A. 구조화된 데이터 추출 테스트
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

**예상 결과:**
```json
[
  { "name": "맛있는 김밥천국", "phone": "📞 02-1234-5678", "address": "📍 서울시 강남구 테헤란로 123" },
  { "name": "행복한 카페", "phone": "📞 02-2345-6789", "address": "📍 서울시 서초구 서초대로 456" },
  ...
]
```

#### B. 스크롤 테스트
```json
{
  "tool": "scroll_page",
  "direction": "bottom"
}
```

#### C. 클릭 테스트
```json
{
  "tool": "click_element",
  "selector": "#click-btn"
}
```

#### D. CSV 저장 테스트
```json
{
  "tool": "save_to_csv",
  "filename": "test_leads.csv",
  "data": [
    { "name": "테스트 업체", "phone": "010-0000-0000" }
  ]
}
```

---

## 2. 실제 사이트 테스트

### 구글 맵 (Google Maps)

#### Step 1: 검색
1. Chrome에서 `https://www.google.com/maps` 접속
2. "강남 카페" 검색
3. 좌측에 리스트가 표시되면 준비 완료

#### Step 2: 셀렉터 확인 (개발자 도구)
```javascript
// 업체 리스트 컨테이너
document.querySelectorAll('[data-index]')

// 업체명
document.querySelector('.fontHeadlineSmall')

// 평점
document.querySelector('.MW4etd')

// 주소
document.querySelector('.W4Efsd')
```

#### Step 3: 추출 명령 (Claude Desktop에서)
```
"구글 맵에서 현재 보이는 업체 리스트를 추출해줘.
컨테이너는 '[data-index]', 
필드는 name: '.fontHeadlineSmall', rating: '.MW4etd', address: '.W4Efsd'
결과를 google_maps_cafes.csv로 저장해줘"
```

### 네이버 지도 (Naver Maps)

#### Step 1: 검색
1. Chrome에서 `https://map.naver.com` 접속
2. "강남 맛집" 검색
3. 좌측 패널에 리스트 표시

#### Step 2: 셀렉터 확인
```javascript
// 업체 리스트 항목
document.querySelectorAll('.CHC5F')

// 업체명
document.querySelector('.TYaxT')

// 카테고리
document.querySelector('.KCMnt')
```

### 주의사항

1. **셀렉터는 변할 수 있습니다**: 구글/네이버가 UI를 업데이트하면 셀렉터가 바뀝니다. 개발자 도구로 현재 구조를 확인하세요.

2. **스크롤 후 대기 필요**: 무한 스크롤 사이트에서는 `scroll_page` 후 `wait_for_element`로 새 데이터 로딩을 기다려야 합니다.

3. **로그인 세션 활용**: 네이버 로그인 상태에서 더 많은 정보(전화번호 등)를 볼 수 있습니다.

---

## 3. Claude Desktop 설정

### claude_desktop_config.json

```json
{
  "mcpServers": {
    "phantom-agent": {
      "command": "node",
      "args": ["/Users/indo/code/project/phantom-agent/mcp-server/index.js"]
    }
  }
}
```

**설정 파일 위치:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 설정 후 Claude Desktop 재시작 필수

---

## 4. 트러블슈팅

### "Chrome Extension이 연결되지 않았습니다"
1. 확장 프로그램이 설치되어 있는지 확인 (`chrome://extensions/`)
2. MCP 서버가 실행 중인지 확인
3. 브라우저 콘솔에서 `[Phantom] ✅ Connected` 메시지 확인

### "Element not found"
1. 페이지가 완전히 로딩되었는지 확인
2. 셀렉터가 정확한지 개발자 도구로 검증
3. `wait_for_element`로 먼저 대기 후 시도

### CSV 파일이 생성되지 않음
1. MCP 서버 로그에서 에러 확인
2. 파일 경로에 쓰기 권한이 있는지 확인
3. 데이터가 빈 배열인지 확인

---

## 5. 전체 워크플로우 예시

### "구글 맵에서 강남 카페 50개 정보 수집"

```
1. navigate_to("https://www.google.com/maps/search/강남+카페")
2. wait_for_element("[data-index]", timeout=10000)
3. 반복:
   a. extract_structured_data(...)
   b. scroll_page("down", 500)
   c. wait_for_element("[data-index]:last-child")
4. save_to_csv("gangnam_cafes.csv", collected_data)
```

이 워크플로우를 자연어로 Claude에게 요청하면 AI가 도구들을 조합해서 실행합니다.
