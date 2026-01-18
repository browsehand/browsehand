let ws = null;
let reconnectInterval = null;

function handleExtensionError(requestId, context, responseType) {
  if (chrome.runtime.lastError) {
    const error = chrome.runtime.lastError;
    const errorMsg = error.message;
    console.error(`[BrowseHand] Error in ${context}:`, error);
    
    let userMsg = errorMsg;
    if (errorMsg && errorMsg.includes('Receiving end does not exist')) {
      userMsg = 'Content script not connected. Please reload the target tab.';
      console.warn('[BrowseHand] 💡 Tip: The content script might not be injected. Try reloading the web page.');
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (responseType) {
        ws.send(JSON.stringify({ 
          type: responseType, 
          requestId: requestId, 
          success: false, 
          error: userMsg 
        }));
      } else {
        ws.send(JSON.stringify({ 
          type: 'error', 
          requestId: requestId, 
          message: userMsg 
        }));
      }
    }
    return true;
  }
  return false;
}

function connectToMCP() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[BrowseHand] Already connected to MCP server');
    return;
  }

  console.log('[BrowseHand] Connecting to MCP server...');
  ws = new WebSocket('ws://localhost:8765');

  ws.onopen = () => {
    console.log('[BrowseHand] ✅ Connected to MCP server');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  };

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log('[BrowseHand] Message from MCP:', message);

    switch (message.type) {
      case 'hello':
        console.log('[BrowseHand] 🎉', message.message);
        break;

      case 'ping':
        ws.send(JSON.stringify({ 
          type: 'pong', 
          requestId: message.requestId,
          success: true,
          timestamp: Date.now() 
        }));
        console.log('[BrowseHand] Pong sent to MCP');
        break;

      case 'read_content':
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'read_content',
            selector: message.payload?.selector || message.selector
          }, (response) => {
            if (handleExtensionError(message.requestId, 'read_content')) return;

            ws.send(JSON.stringify({ 
              type: 'content',
              requestId: message.requestId,
              success: true,
              data: response.content 
            }));
          });
        }
        break;

      case 'execute_script':
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs[0]) {
          chrome.tabs.sendMessage(activeTabs[0].id, {
            action: 'execute_script',
            code: message.payload?.code || message.code
          }, (response) => {
            if (handleExtensionError(message.requestId, 'execute_script')) return;

            ws.send(JSON.stringify({ 
              type: 'script_result',
              requestId: message.requestId,
              success: true,
              result: response.result 
            }));
          });
        }
        break;

      case 'scroll_page': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const payload = message.payload || message;
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'scroll_page',
            direction: payload.direction,
            amount: payload.amount
          }, (response) => {
            if (handleExtensionError(message.requestId, 'scroll_page')) return;

            ws.send(JSON.stringify({ type: 'scroll_result', requestId: message.requestId, success: true }));
          });
        }
        break;
      }

      case 'click_element': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const payload = message.payload || message;
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'click_element',
            selector: payload.selector,
            waitAfter: payload.waitAfter
          }, (response) => {
            if (handleExtensionError(message.requestId, 'click_element', 'click_result')) return;

            ws.send(JSON.stringify({ type: 'click_result', requestId: message.requestId, success: response.success, error: response.error }));
          });
        }
        break;
      }

      case 'wait_for_element': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const payload = message.payload || message;
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'wait_for_element',
            selector: payload.selector,
            timeout: payload.timeout
          }, (response) => {
            if (handleExtensionError(message.requestId, 'wait_for_element', 'wait_result')) return;

            ws.send(JSON.stringify({ type: 'wait_result', requestId: message.requestId, success: response.success }));
          });
        }
        break;
      }

      case 'extract_structured_data': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const payload = message.payload || message;
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'extract_structured_data',
            containerSelector: payload.containerSelector,
            fields: payload.fields,
            limit: payload.limit
          }, (response) => {
            if (handleExtensionError(message.requestId, 'extract_structured_data', 'extracted_data')) return;

            ws.send(JSON.stringify({ type: 'extracted_data', requestId: message.requestId, success: response.success, data: response.data, error: response.error }));
          });
        }
        break;
      }

      case 'get_current_url': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          ws.send(JSON.stringify({ type: 'current_url', requestId: message.requestId, success: true, url: tabs[0].url }));
        }
        break;
      }

      case 'navigate_to': {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const payload = message.payload || message;
          chrome.tabs.update(tabs[0].id, { url: payload.url }, () => {
            if (handleExtensionError(message.requestId, 'navigate_to', 'navigation_result')) return;

            setTimeout(() => {
              ws.send(JSON.stringify({ type: 'navigation_result', requestId: message.requestId, success: true }));
            }, 2000);
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
            if (handleExtensionError(message.requestId, 'get_dom_snapshot', 'dom_snapshot')) return;

            ws.send(JSON.stringify({ type: 'dom_snapshot', requestId: message.requestId, success: response.success, html: response.html }));
          });
        }
        break;
      }
    }
  };

  ws.onerror = (error) => {
    console.error('[BrowseHand] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[BrowseHand] ❌ Disconnected from MCP server. Reconnecting...');
    ws = null;
    
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        connectToMCP();
      }, 3000);
    }
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BrowseHand] Extension installed. Connecting to MCP...');
  connectToMCP();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[BrowseHand] Browser started. Connecting to MCP...');
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
