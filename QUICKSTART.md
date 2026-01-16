# 🚀 빠른 시작 가이드

## 1단계: MCP 서버 실행

```bash
cd /Users/indo/code/project/phantom-agent/mcp-server
npm install
npm start
```

**예상 출력:**
```
[MCP] Starting Phantom Agent MCP Server...
[MCP] WebSocket server listening on ws://localhost:8765
[MCP] MCP Server ready. Waiting for Chrome Extension connection...
```

## 2단계: Chrome Extension 설치

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 우측 상단 **"개발자 모드"** 토글 활성화
4. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
5. `/Users/indo/code/project/phantom-agent/chrome-extension` 폴더 선택

**확인 방법:**
- 확장 프로그램 목록에 "Phantom Agent" 표시
- 브라우저 콘솔(F12)에서 `[Phantom] ✅ Connected to MCP server` 메시지 확인

## 3단계: 테스트 페이지 열기

```bash
open /Users/indo/code/project/phantom-agent/test-page.html
```

또는 브라우저에서 직접 파일 열기

## 4단계: Claude Desktop 설정 (선택사항)

Claude Desktop과 연동하려면:

```bash
# 설정 파일 열기
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

다음 내용 추가:

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

Claude Desktop 재시작 후 사용 가능

## 5단계: 테스트

### 브라우저 콘솔에서 직접 테스트

1. 테스트 페이지 열기
2. F12 눌러 개발자 도구 열기
3. Console 탭에서 확인:

```javascript
// MCP 서버 연결 상태 확인
// [Phantom] ✅ Connected to MCP server 메시지가 보여야 함
```

### Claude Desktop에서 테스트

테스트 페이지를 열어둔 상태에서 Claude에게:

```
"ping_extension 도구를 사용해서 확장 프로그램 연결 상태를 확인해줘"
```

```
"read_browser_content 도구로 현재 페이지의 내용을 읽어줘"
```

```
"execute_script 도구로 document.title을 실행해줘"
```

## 문제 해결

### 확장 프로그램이 연결되지 않음

1. MCP 서버가 실행 중인지 확인
2. 브라우저 콘솔에서 에러 메시지 확인
3. 확장 프로그램 재로드: `chrome://extensions/`에서 새로고침 버튼 클릭

### MCP 서버 에러

```bash
# 포트가 이미 사용 중인 경우
lsof -ti:8765 | xargs kill -9

# 다시 시작
npm start
```

### 아이콘 경고

아이콘 파일이 없어도 기능은 정상 작동합니다. 경고를 없애려면:

```bash
cd chrome-extension
# 아무 PNG 이미지를 복사해서
cp /path/to/any/image.png icon16.png
cp /path/to/any/image.png icon48.png
cp /path/to/any/image.png icon128.png
```

## 다음 단계

Phase 1 완료! 이제 다음 기능을 추가할 수 있습니다:

- [ ] 페이지네이션 자동 처리
- [ ] 데이터를 CSV로 저장
- [ ] 특정 셀렉터로 데이터 추출
- [ ] 클릭 이벤트 자동화

개발을 계속하려면 `README.md`의 로드맵을 참고하세요.
