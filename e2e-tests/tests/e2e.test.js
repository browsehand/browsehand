import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../chrome-extension');
const TEST_PAGE = path.resolve(__dirname, '../../test-page.html');

let browser;
let page;
let mcpServer;
let requestId = 0;

function startMcpServer() {
  return new Promise((resolve, reject) => {
    mcpServer = spawn('node', ['index.js'], {
      cwd: path.resolve(__dirname, '../../mcp-server'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    mcpServer.stderr.on('data', (data) => {
      const msg = data.toString();
      console.log('[MCP]', msg.trim());
      if (msg.includes('WebSocket server listening')) {
        setTimeout(resolve, 300);
      }
    });

    mcpServer.on('error', reject);
    setTimeout(() => resolve(), 2000);
  });
}

function waitForExtensionConnection(timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Extension connection timeout')), timeout);
    
    const handler = (data) => {
      if (data.toString().includes('Chrome Extension connected')) {
        clearTimeout(timer);
        mcpServer.stderr.off('data', handler);
        setTimeout(resolve, 500);
      }
    };
    
    mcpServer.stderr.on('data', handler);
  });
}

function callTool(name, args = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timeout = setTimeout(() => reject(new Error(`Tool ${name} timeout`)), 15000);
    
    let buffer = '';
    const handler = (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          if (response.id === id) {
            clearTimeout(timeout);
            mcpServer.stdout.off('data', handler);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
            return;
          }
        } catch (e) {}
      }
    };
    
    mcpServer.stdout.on('data', handler);
    
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: args }
    });
    
    mcpServer.stdin.write(request + '\n');
  });
}

describe('BrowseHand E2E (Real Browser)', { timeout: 120000 }, () => {
  before(async () => {
    console.log('1. Starting MCP server...');
    await startMcpServer();
    
    const extensionPromise = waitForExtensionConnection();
    
    console.log('2. Launching browser with extension...');
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('3. Navigating to test page...');
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();
    await page.goto(`file://${TEST_PAGE}`, { waitUntil: 'networkidle0' });
    
    console.log('4. Waiting for extension connection...');
    await extensionPromise;
    console.log('Setup complete!');
  });

  after(async () => {
    if (browser) await browser.close();
    if (mcpServer) mcpServer.kill();
  });

  test('1. ping_extension', async () => {
    const result = await callTool('ping_extension');
    assert.ok(result.content[0].text.includes('Ping sent'));
  });

  test('2. read_browser_content (h1)', async () => {
    const result = await callTool('read_browser_content', { selector: 'h1' });
    const text = result.content[0].text;
    assert.ok(text.includes('BrowseHand'), `Expected h1 to contain "BrowseHand", got: ${text}`);
  });

  test('3. execute_script', async () => {
    const result = await callTool('execute_script', { 
      code: 'document.title' 
    });
    const text = result.content[0].text;
    assert.ok(text.includes('Result') || text.includes('Script'), `execute_script should return result: ${text}`);
  });

  test('4. extract_structured_data', async () => {
    const result = await callTool('extract_structured_data', {
      containerSelector: '.business-item',
      fields: {
        name: '.business-name',
        phone: '.business-phone',
        address: '.business-address'
      }
    });
    const text = result.content[0].text;
    assert.ok(text.includes('맛있는 김밥천국'), `Expected first business name, got: ${text}`);
    assert.ok(text.includes('4 items') || text.includes('Extracted 4'), `Expected 4 items extracted`);
  });

  test('5. scroll_page (down)', async () => {
    const result = await callTool('scroll_page', { direction: 'down', amount: 500 });
    const text = result.content[0].text;
    assert.ok(text.includes('Scrolled') || text.includes('✅'), `Scroll should succeed: ${text}`);
  });

  test('6. scroll_page (top)', async () => {
    const result = await callTool('scroll_page', { direction: 'top' });
    const text = result.content[0].text;
    assert.ok(text.includes('Scrolled') || text.includes('✅'), `Scroll to top should succeed: ${text}`);
  });

  test('7. click_element', async () => {
    const result = await callTool('click_element', { selector: '#click-btn' });
    const text = result.content[0].text;
    assert.ok(text.includes('Clicked') || text.includes('✅'), `Click should succeed: ${text}`);
  });

  test('8. get_dom_snapshot', async () => {
    const result = await callTool('get_dom_snapshot');
    const text = result.content[0].text;
    assert.ok(text.includes('business-item'), `DOM snapshot should contain business-item class`);
  });

  test('9. get_current_url', async () => {
    const result = await callTool('get_current_url');
    const text = result.content[0].text;
    assert.ok(text.includes('test-page.html'), `URL should contain test-page.html: ${text}`);
  });
});
