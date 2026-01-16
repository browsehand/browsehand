import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WS_URL = 'ws://localhost:8765';

let mcpServer;
let mockExtension;

function startMcpServer() {
  return new Promise((resolve, reject) => {
    mcpServer = spawn('node', ['index.js'], {
      cwd: path.resolve(__dirname, '../../mcp-server'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    mcpServer.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('WebSocket server listening')) {
        setTimeout(resolve, 300);
      }
    });

    mcpServer.on('error', reject);
    setTimeout(() => resolve(), 2000);
  });
}

function connectAsMockExtension() {
  return new Promise((resolve, reject) => {
    mockExtension = new WebSocket(WS_URL);
    mockExtension.on('open', () => {
      mockExtension.once('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'hello') {
          resolve(mockExtension);
        }
      });
    });
    mockExtension.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

describe('MCP Server Integration Tests', { timeout: 30000 }, () => {
  before(async () => {
    console.log('Starting MCP server...');
    await startMcpServer();
    console.log('Connecting mock extension...');
    await connectAsMockExtension();
    console.log('Setup complete');
  });

  after(() => {
    if (mockExtension) mockExtension.close();
    if (mcpServer) mcpServer.kill();
  });

  test('1. WebSocket 서버 연결', () => {
    assert.strictEqual(mockExtension.readyState, WebSocket.OPEN);
  });

  test('2. ping 메시지 처리', (t, done) => {
    mockExtension.once('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        mockExtension.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        done();
      }
    });
    
    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'ping_extension', arguments: {} }
    }) + '\n');
  });

  test('3. read_content 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'read_content') {
        assert.strictEqual(msg.selector, 'h1');
        mockExtension.send(JSON.stringify({ 
          type: 'content', 
          data: 'Test Page Title' 
        }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'read_browser_content', arguments: { selector: 'h1' } }
    }) + '\n');
  });

  test('4. scroll_page 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'scroll_page') {
        assert.strictEqual(msg.direction, 'down');
        assert.strictEqual(msg.amount, 500);
        mockExtension.send(JSON.stringify({ type: 'scroll_result', success: true }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'scroll_page', arguments: { direction: 'down', amount: 500 } }
    }) + '\n');
  });

  test('5. click_element 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'click_element') {
        assert.strictEqual(msg.selector, '#test-btn');
        mockExtension.send(JSON.stringify({ type: 'click_result', success: true }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'click_element', arguments: { selector: '#test-btn' } }
    }) + '\n');
  });

  test('6. extract_structured_data 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'extract_structured_data') {
        assert.strictEqual(msg.containerSelector, '.item');
        assert.deepStrictEqual(msg.fields, { name: '.name', price: '.price' });
        mockExtension.send(JSON.stringify({ 
          type: 'extracted_data', 
          success: true,
          data: [{ name: 'Item 1', price: '1000' }]
        }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { 
        name: 'extract_structured_data', 
        arguments: { 
          containerSelector: '.item',
          fields: { name: '.name', price: '.price' }
        } 
      }
    }) + '\n');
  });

  test('7. get_dom_snapshot 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'get_dom_snapshot') {
        mockExtension.send(JSON.stringify({ 
          type: 'dom_snapshot', 
          success: true,
          html: '<div class="test">Hello</div>'
        }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'get_dom_snapshot', arguments: {} }
    }) + '\n');
  });

  test('8. execute_script 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'execute_script') {
        assert.strictEqual(msg.code, 'document.title');
        mockExtension.send(JSON.stringify({ 
          type: 'script_result', 
          result: 'Test Page'
        }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'execute_script', arguments: { code: 'document.title' } }
    }) + '\n');
  });

  test('9. navigate_to 메시지 수신', (t, done) => {
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'navigate_to') {
        assert.strictEqual(msg.url, 'https://example.com');
        mockExtension.send(JSON.stringify({ 
          type: 'navigation_result', 
          success: true
        }));
        mockExtension.off('message', handler);
        done();
      }
    };
    mockExtension.on('message', handler);

    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { name: 'navigate_to', arguments: { url: 'https://example.com' } }
    }) + '\n');
  });
});
