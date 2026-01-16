let ws = null;
let reconnectInterval = null;

function connectToMCP() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[Phantom] Already connected to MCP server');
    return;
  }

  console.log('[Phantom] Connecting to MCP server...');
  ws = new WebSocket('ws://localhost:8765');

  ws.onopen = () => {
    console.log('[Phantom] ✅ Connected to MCP server');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  };

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log('[Phantom] Message from MCP:', message);

    switch (message.type) {
      case 'hello':
        console.log('[Phantom] 🎉', message.message);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        console.log('[Phantom] Pong sent to MCP');
        break;

      case 'read_content':
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'read_content',
            selector: message.selector
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Phantom] Error:', chrome.runtime.lastError);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: chrome.runtime.lastError.message 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'content', 
                data: response.content 
              }));
            }
          });
        }
        break;

      case 'execute_script':
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs[0]) {
          chrome.tabs.sendMessage(activeTabs[0].id, {
            action: 'execute_script',
            code: message.code
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Phantom] Error:', chrome.runtime.lastError);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: chrome.runtime.lastError.message 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'script_result', 
                result: response.result 
              }));
            }
          });
        }
        break;

      case 'scroll_page': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'scroll_page',
            direction: message.direction,
            amount: message.amount
          }, (response) => {
            if (chrome.runtime.lastError) {
              ws.send(JSON.stringify({ type: 'error', message: chrome.runtime.lastError.message }));
            } else {
              ws.send(JSON.stringify({ type: 'scroll_result', success: true }));
            }
          });
        }
        break;
      }

      case 'click_element': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'click_element',
            selector: message.selector,
            waitAfter: message.waitAfter
          }, (response) => {
            if (chrome.runtime.lastError) {
              ws.send(JSON.stringify({ type: 'click_result', success: false, error: chrome.runtime.lastError.message }));
            } else {
              ws.send(JSON.stringify({ type: 'click_result', success: response.success, error: response.error }));
            }
          });
        }
        break;
      }

      case 'wait_for_element': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'wait_for_element',
            selector: message.selector,
            timeout: message.timeout
          }, (response) => {
            if (chrome.runtime.lastError) {
              ws.send(JSON.stringify({ type: 'wait_result', success: false, error: chrome.runtime.lastError.message }));
            } else {
              ws.send(JSON.stringify({ type: 'wait_result', success: response.success }));
            }
          });
        }
        break;
      }

      case 'extract_structured_data': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'extract_structured_data',
            containerSelector: message.containerSelector,
            fields: message.fields,
            limit: message.limit
          }, (response) => {
            if (chrome.runtime.lastError) {
              ws.send(JSON.stringify({ type: 'extracted_data', success: false, error: chrome.runtime.lastError.message }));
            } else {
              ws.send(JSON.stringify({ type: 'extracted_data', success: response.success, data: response.data, error: response.error }));
            }
          });
        }
        break;
      }

      case 'get_current_url': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          ws.send(JSON.stringify({ type: 'current_url', url: tabs[0].url }));
        }
        break;
      }

      case 'navigate_to': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.update(tabs[0].id, { url: message.url }, () => {
            if (chrome.runtime.lastError) {
              ws.send(JSON.stringify({ type: 'navigation_result', success: false, error: chrome.runtime.lastError.message }));
            } else {
              setTimeout(() => {
                ws.send(JSON.stringify({ type: 'navigation_result', success: true }));
              }, 2000);
            }
          });
        }
        break;
      }

      case 'get_dom_snapshot': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'get_dom_snapshot'
          }, (response) => {
            if (chrome.runtime.lastError) {
              ws.send(JSON.stringify({ type: 'dom_snapshot', success: false, error: chrome.runtime.lastError.message }));
            } else {
              ws.send(JSON.stringify({ type: 'dom_snapshot', success: response.success, html: response.html }));
            }
          });
        }
        break;
      }
    }
  };

  ws.onerror = (error) => {
    console.error('[Phantom] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[Phantom] ❌ Disconnected from MCP server. Reconnecting...');
    ws = null;
    
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        connectToMCP();
      }, 3000);
    }
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Phantom] Extension installed. Connecting to MCP...');
  connectToMCP();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Phantom] Browser started. Connecting to MCP...');
  connectToMCP();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reconnect') {
    connectToMCP();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getStatus') {
    const connected = ws && ws.readyState === WebSocket.OPEN;
    sendResponse({ connected });
    return true;
  }
});

connectToMCP();
