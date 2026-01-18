mod tools;
mod websocket;

use anyhow::Result;
use rmcp::{
    ErrorData as McpError, ServerHandler, ServiceExt,
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::*,
    schemars,
    tool, tool_handler, tool_router,
    transport::stdio,
};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info};
use websocket::ExtensionBridge;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ReadContentArgs {
    #[schemars(description = "추출할 DOM 셀렉터 (선택사항, 기본값: body)")]
    pub selector: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ExecuteScriptArgs {
    #[schemars(description = "실행할 JavaScript 코드")]
    pub code: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct SaveCsvArgs {
    #[schemars(description = "저장할 파일명 (예: leads.csv)")]
    pub filename: String,
    #[schemars(description = "저장할 데이터 배열")]
    pub data: Value,
    #[schemars(description = "true면 기존 파일에 추가")]
    pub append: Option<bool>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct SaveJsonArgs {
    #[schemars(description = "저장할 파일명 (예: data.json)")]
    pub filename: String,
    #[schemars(description = "저장할 데이터")]
    pub data: Value,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ScrollArgs {
    #[schemars(description = "스크롤 방향: down, up, bottom, top")]
    pub direction: String,
    #[schemars(description = "스크롤할 픽셀 수 (기본값: 500)")]
    pub amount: Option<i32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ClickArgs {
    #[schemars(description = "클릭할 요소의 CSS 셀렉터")]
    pub selector: String,
    #[schemars(description = "클릭 후 대기할 밀리초 (기본값: 1000)")]
    pub wait_after: Option<i32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct WaitArgs {
    #[schemars(description = "대기할 요소의 CSS 셀렉터")]
    pub selector: String,
    #[schemars(description = "최대 대기 시간(밀리초, 기본값: 10000)")]
    pub timeout: Option<i32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ExtractArgs {
    #[schemars(description = "반복되는 각 항목의 컨테이너 셀렉터 (예: '.item')")]
    pub container_selector: String,
    #[schemars(description = "추출할 필드 정의 (예: {\"name\": \".name\", \"price\": \".price\"})")]
    pub fields: Value,
    #[schemars(description = "최대 추출 개수")]
    pub limit: Option<i32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct NavigateArgs {
    #[schemars(description = "이동할 URL")]
    pub url: String,
}

#[derive(Clone)]
pub struct BrowseHand {
    bridge: Arc<RwLock<ExtensionBridge>>,
    tool_router: ToolRouter<BrowseHand>,
}

#[tool_router]
impl BrowseHand {
    pub fn new(bridge: Arc<RwLock<ExtensionBridge>>) -> Self {
        Self {
            bridge,
            tool_router: Self::tool_router(),
        }
    }

    #[tool(description = "현재 활성화된 브라우저 탭의 HTML 콘텐츠를 읽어옵니다.")]
    async fn read_browser_content(
        &self,
        Parameters(args): Parameters<ReadContentArgs>,
    ) -> Result<CallToolResult, McpError> {
        let selector = args.selector.unwrap_or_else(|| "body".to_string());
        let bridge = self.bridge.read().await;
        
        match bridge
            .send_and_wait("read_content", serde_json::json!({ "selector": selector }))
            .await
        {
            Ok(response) => Ok(CallToolResult::success(vec![Content::text(format!(
                "Content from \"{}\":\n\n{}",
                selector,
                response["data"].as_str().unwrap_or("")
            ))])),
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "브라우저에서 JavaScript 코드를 실행합니다.")]
    async fn execute_script(
        &self,
        Parameters(args): Parameters<ExecuteScriptArgs>,
    ) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        match bridge
            .send_and_wait("execute_script", serde_json::json!({ "code": args.code }))
            .await
        {
            Ok(response) => Ok(CallToolResult::success(vec![Content::text(format!(
                "Script executed. Result:\n{}",
                serde_json::to_string_pretty(&response["result"]).unwrap_or_default()
            ))])),
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "Chrome Extension과의 연결 상태를 확인합니다.")]
    async fn ping_extension(&self) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;

        if bridge.is_connected() {
            match bridge.send_and_wait("ping", serde_json::json!({})).await {
                Ok(_) => Ok(CallToolResult::success(vec![Content::text(
                    "✅ Chrome Extension is connected and responding.",
                )])),
                Err(e) => Ok(CallToolResult::success(vec![Content::text(format!(
                    "⚠️ Connected but not responding: {}",
                    e
                ))])),
            }
        } else {
            Ok(CallToolResult::success(vec![Content::text(
                "❌ Chrome Extension is not connected.",
            )]))
        }
    }

    #[tool(description = "데이터를 CSV 파일로 저장합니다. 경로를 지정하지 않으면 바탕화면에 저장됩니다.")]
    fn save_to_csv(
        &self,
        Parameters(args): Parameters<SaveCsvArgs>,
    ) -> Result<CallToolResult, McpError> {
        match tools::save_csv(&args.filename, &args.data, args.append.unwrap_or(false)) {
            Ok(path) => Ok(CallToolResult::success(vec![Content::text(format!(
                "✅ Successfully saved to {}",
                path
            ))])),
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "데이터를 JSON 파일로 저장합니다. 경로를 지정하지 않으면 바탕화면에 저장됩니다.")]
    fn save_to_json(
        &self,
        Parameters(args): Parameters<SaveJsonArgs>,
    ) -> Result<CallToolResult, McpError> {
        match tools::save_json(&args.filename, &args.data) {
            Ok(path) => Ok(CallToolResult::success(vec![Content::text(format!(
                "✅ Successfully saved to {}",
                path
            ))])),
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "브라우저 페이지를 스크롤합니다.")]
    async fn scroll_page(
        &self,
        Parameters(args): Parameters<ScrollArgs>,
    ) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        let amount = args.amount.unwrap_or(500);
        
        match bridge
            .send_and_wait("scroll_page", serde_json::json!({
                "direction": args.direction,
                "amount": amount
            }))
            .await
        {
            Ok(_) => {
                let suffix = if args.direction == "down" || args.direction == "up" {
                    format!(" by {}px", amount)
                } else {
                    String::new()
                };
                Ok(CallToolResult::success(vec![Content::text(format!(
                    "✅ Scrolled {}{}",
                    args.direction, suffix
                ))]))
            }
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "특정 CSS 셀렉터의 요소를 클릭합니다.")]
    async fn click_element(
        &self,
        Parameters(args): Parameters<ClickArgs>,
    ) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        match bridge
            .send_and_wait("click_element", serde_json::json!({
                "selector": args.selector,
                "waitAfter": args.wait_after.unwrap_or(1000)
            }))
            .await
        {
            Ok(response) => {
                if response["success"].as_bool().unwrap_or(false) {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "✅ Clicked element: {}",
                        args.selector
                    ))]))
                } else {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "❌ Failed to click: {}",
                        response["error"].as_str().unwrap_or("unknown")
                    ))]))
                }
            }
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "특정 요소가 나타날 때까지 대기합니다.")]
    async fn wait_for_element(
        &self,
        Parameters(args): Parameters<WaitArgs>,
    ) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        match bridge
            .send_and_wait("wait_for_element", serde_json::json!({
                "selector": args.selector,
                "timeout": args.timeout.unwrap_or(10000)
            }))
            .await
        {
            Ok(response) => {
                if response["success"].as_bool().unwrap_or(false) {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "✅ Element found: {}",
                        args.selector
                    ))]))
                } else {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "❌ Element not found: {}",
                        args.selector
                    ))]))
                }
            }
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "반복되는 요소들에서 구조화된 데이터를 추출합니다. 예: 업체 리스트에서 이름, 전화번호, 주소를 배열로 추출.")]
    async fn extract_structured_data(
        &self,
        Parameters(args): Parameters<ExtractArgs>,
    ) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        let mut payload = serde_json::json!({
            "containerSelector": args.container_selector,
            "fields": args.fields
        });
        if let Some(l) = args.limit {
            payload["limit"] = serde_json::json!(l);
        }
        
        match bridge.send_and_wait("extract_structured_data", payload).await {
            Ok(response) => {
                if response["success"].as_bool().unwrap_or(false) {
                    let data = &response["data"];
                    let count = data.as_array().map(|a| a.len()).unwrap_or(0);
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "✅ Extracted {} items:\n{}",
                        count,
                        serde_json::to_string_pretty(data).unwrap_or_default()
                    ))]))
                } else {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "❌ Extraction failed: {}",
                        response["error"].as_str().unwrap_or("unknown")
                    ))]))
                }
            }
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "현재 브라우저 탭의 URL을 가져옵니다.")]
    async fn get_current_url(&self) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        match bridge.send_and_wait("get_current_url", serde_json::json!({})).await {
            Ok(response) => Ok(CallToolResult::success(vec![Content::text(format!(
                "Current URL: {}",
                response["url"].as_str().unwrap_or("unknown")
            ))])),
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "AI 분석을 위해 현재 페이지의 DOM 구조(주요 태그와 텍스트)를 가져옵니다. 불필요한 태그는 제거됩니다.")]
    async fn get_dom_snapshot(&self) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        match bridge.send_and_wait("get_dom_snapshot", serde_json::json!({})).await {
            Ok(response) => Ok(CallToolResult::success(vec![Content::text(format!(
                "DOM Snapshot:\n{}",
                response["html"].as_str().unwrap_or("")
            ))])),
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }

    #[tool(description = "브라우저를 특정 URL로 이동시킵니다.")]
    async fn navigate_to(
        &self,
        Parameters(args): Parameters<NavigateArgs>,
    ) -> Result<CallToolResult, McpError> {
        let bridge = self.bridge.read().await;
        
        match bridge
            .send_and_wait("navigate_to", serde_json::json!({ "url": args.url }))
            .await
        {
            Ok(response) => {
                if response["success"].as_bool().unwrap_or(false) {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "✅ Navigated to: {}",
                        args.url
                    ))]))
                } else {
                    Ok(CallToolResult::success(vec![Content::text(format!(
                        "❌ Navigation failed: {}",
                        response["error"].as_str().unwrap_or("unknown")
                    ))]))
                }
            }
            Err(e) => Ok(CallToolResult::success(vec![Content::text(format!("Error: {}", e))])),
        }
    }
}

#[tool_handler]
impl ServerHandler for BrowseHand {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .build(),
            server_info: Implementation::from_build_env(),
            instructions: Some("AI가 브라우저를 직접 제어하는 로컬 에이전트입니다. Chrome Extension이 연결되어 있어야 브라우저 제어 도구를 사용할 수 있습니다.".into()),
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter("browsehand=info")
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .init();

    info!("Starting BrowseHand MCP Server...");

    let bridge = Arc::new(RwLock::new(ExtensionBridge::new()));
    let bridge_clone = Arc::clone(&bridge);

    tokio::spawn(async move {
        if let Err(e) = websocket::run_websocket_server(bridge_clone).await {
            error!("WebSocket server error: {}", e);
        }
    });

    info!("WebSocket server listening on ws://localhost:8765");

    let agent = BrowseHand::new(bridge);

    info!("MCP Server ready. Waiting for Chrome Extension connection...");

    let service = agent.serve(stdio()).await.inspect_err(|e| {
        error!("serving error: {:?}", e);
    })?;

    service.waiting().await?;

    Ok(())
}
