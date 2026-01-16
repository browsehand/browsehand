# 👻 Phantom Agent

AI가 당신의 브라우저를 직접 제어하는 로컬 에이전트 시스템

## 🎯 핵심 기능

- **실시간 브라우저 제어**: AI(Claude)가 현재 열린 탭의 데이터를 읽고 조작
- **로그인 세션 유지**: 사용자가 이미 로그인한 브라우저 환경을 그대로 활용
- **로컬 파일 저장**: 수집한 데이터를 CSV, JSON 등으로 로컬에 저장
- **차단 회피**: 사용자의 실제 브라우저를 사용하므로 봇 탐지 우회
- **구조화된 데이터 추출**: CSS 셀렉터 기반으로 리스트 데이터를 자동 파싱

## 🏗️ 시스템 구조

```
사용자/Claude → MCP 서버 (localhost:8765) ↔ Chrome Extension → 활성 탭
```

## 🛠️ 사용 가능한 도구 (MCP Tools)

| 도구 | 설명 |
|------|------|
| `read_browser_content` | 현재 탭의 텍스트 콘텐츠 읽기 |
| `execute_script` | JavaScript 코드 실행 |
| `extract_structured_data` | 반복 요소에서 구조화된 데이터 추출 |
| `click_element` | CSS 셀렉터로 요소 클릭 |
| `scroll_page` | 페이지 스크롤 (up/down/top/bottom) |
| `wait_for_element` | 특정 요소가 나타날 때까지 대기 |
| `navigate_to` | 특정 URL로 이동 |
| `get_current_url` | 현재 URL 가져오기 |
| `save_to_csv` | 데이터를 CSV 파일로 저장 |
| `save_to_json` | 데이터를 JSON 파일로 저장 |
| `ping_extension` | 확장 프로그램 연결 상태 확인 |

## 🚀 설치 및 실행

### 1. MCP 서버 설치

```bash
cd mcp-server
npm install
npm start
```

서버가 `ws://localhost:8765`에서 대기합니다.

### 2. Chrome Extension 설치

1. Chrome 브라우저에서 `chrome://extensions/` 접속
2. 우측 상단 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `chrome-extension` 폴더 선택

### 3. Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일에 추가:

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

## 📖 사용 예시

### 기본 사용
```
"지금 보고 있는 페이지의 제목을 읽어줘"
"확장 프로그램 연결 상태 확인해줘"
```

### 데이터 추출 및 저장
```
"현재 페이지에서 .item 클래스 안의 .name과 .price를 추출해서 products.csv로 저장해줘"
```

### 자동화 워크플로우
```
"구글 맵에서 '강남 카페' 검색 결과를 스크롤하면서 50개 업체 정보를 수집하고 CSV로 저장해줘"
```

## 🛠️ 개발 로드맵

### Phase 1: 통신 파이프라인 ✅
- [x] WebSocket 서버 구축
- [x] Chrome Extension 기본 구조
- [x] MCP Tools 정의 (ping, read, execute)

### Phase 2: 스크래핑 기능 ✅
- [x] 페이지 스크롤 자동화
- [x] 요소 클릭 자동화
- [x] 대기 로직 (wait_for_element)
- [x] 구조화된 데이터 추출
- [x] CSV/JSON 저장 기능
- [x] URL 네비게이션

### Phase 3: 고급 자동화 (예정)
- [ ] 폼 자동 입력
- [ ] 캡차 감지 및 알림
- [ ] 멀티 탭 지원
- [ ] 스케줄링 기능

## 🔧 기술 스택

- **MCP 서버**: Node.js, @modelcontextprotocol/sdk, ws
- **Chrome Extension**: Manifest V3, WebSocket Client
- **통신**: WebSocket (양방향 실시간)

## 📁 프로젝트 구조

```
phantom-agent/
├── mcp-server/
│   ├── index.js          # MCP 서버 + WebSocket 서버
│   └── package.json
├── chrome-extension/
│   ├── manifest.json     # Extension 설정
│   ├── background.js     # WebSocket 클라이언트
│   ├── content.js        # DOM 조작 스크립트
│   ├── popup.html        # 팝업 UI
│   └── popup.js
├── test-page.html        # 로컬 테스트 페이지
├── QUICKSTART.md         # 빠른 시작 가이드
├── TESTING_GUIDE.md      # 테스트 가이드
└── README.md
```

## ⚠️ 주의사항

- MCP 서버가 실행 중이어야 확장 프로그램이 작동합니다
- 로컬호스트(localhost)에서만 동작하며 외부 접근 불가
- 사용자의 브라우저 세션을 활용하므로 보안에 유의하세요
- 웹사이트의 이용약관을 준수하세요

## 📝 라이선스

MIT
