use anyhow::{anyhow, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, oneshot, RwLock};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{error, info, warn};
use uuid::Uuid;

type PendingRequests = HashMap<String, oneshot::Sender<Value>>;

pub struct ExtensionBridge {
    sender: Option<mpsc::UnboundedSender<String>>,
    pending: Arc<RwLock<PendingRequests>>,
    connected: bool,
}

impl ExtensionBridge {
    pub fn new() -> Self {
        Self {
            sender: None,
            pending: Arc::new(RwLock::new(HashMap::new())),
            connected: false,
        }
    }

    pub fn is_connected(&self) -> bool {
        self.connected
    }

    pub async fn send_and_wait(&self, msg_type: &str, payload: Value) -> Result<Value> {
        let sender = self.sender.as_ref().ok_or_else(|| anyhow!("Extension not connected"))?;
        
        let request_id = Uuid::new_v4().to_string();
        let message = serde_json::json!({
            "type": msg_type,
            "requestId": request_id,
            "payload": payload
        });
        
        let (tx, rx) = oneshot::channel();
        
        {
            let mut pending = self.pending.write().await;
            pending.insert(request_id.clone(), tx);
        }
        
        sender.send(message.to_string())?;
        
        let timeout = tokio::time::timeout(
            std::time::Duration::from_secs(30),
            rx
        ).await;
        
        {
            let mut pending = self.pending.write().await;
            pending.remove(&request_id);
        }
        
        match timeout {
            Ok(Ok(response)) => Ok(response),
            Ok(Err(_)) => Err(anyhow!("Response channel closed")),
            Err(_) => Err(anyhow!("Request timeout")),
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    bridge: Arc<RwLock<ExtensionBridge>>,
) -> Result<()> {
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();
    
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    
    {
        let mut bridge_guard = bridge.write().await;
        bridge_guard.sender = Some(tx);
        bridge_guard.connected = true;
    }
    
    info!("Chrome Extension connected via WebSocket");
    
    let hello = serde_json::json!({
        "type": "hello",
        "message": "MCP Server Connected!"
    });
    write.send(Message::Text(hello.to_string())).await?;
    
    let pending = {
        let bridge_guard = bridge.read().await;
        Arc::clone(&bridge_guard.pending)
    };
    
    let write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });
    
    while let Some(msg) = read.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(json) = serde_json::from_str::<Value>(&text) {
                    if let Some(request_id) = json.get("requestId").and_then(|v| v.as_str()) {
                        let mut pending_guard = pending.write().await;
                        if let Some(sender) = pending_guard.remove(request_id) {
                            let _ = sender.send(json);
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Err(e) => {
                error!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }
    
    write_task.abort();
    
    {
        let mut bridge_guard = bridge.write().await;
        bridge_guard.sender = None;
        bridge_guard.connected = false;
    }
    
    warn!("Chrome Extension disconnected");
    
    Ok(())
}

pub async fn run_websocket_server(bridge: Arc<RwLock<ExtensionBridge>>) -> Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8765").await?;
    info!("WebSocket server listening on ws://localhost:8765");
    
    loop {
        let (stream, addr) = listener.accept().await?;
        info!("New connection from: {}", addr);
        
        let bridge_clone = Arc::clone(&bridge);
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, bridge_clone).await {
                error!("Connection handler error: {}", e);
            }
        });
    }
}
