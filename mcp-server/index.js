#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import os from 'os';

// WebSocket 서버 (Chrome Extension과 통신)
const wss = new WebSocketServer({ port: 8765 });
let extensionSocket = null;

wss.on('connection', (ws) => {
  console.error('[MCP] Chrome Extension connected via WebSocket');
  extensionSocket = ws;

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.error('[MCP] Received from extension:', message);
  });

  ws.on('close', () => {
    console.error('[MCP] Chrome Extension disconnected');
    extensionSocket = null;
  });

  // 연결 확인 메시지 전송
  ws.send(JSON.stringify({ type: 'hello', message: 'MCP Server Connected!' }));
});

// MCP 서버 초기화
const server = new Server(
  {
    name: "phantom-agent",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// MCP Tools 정의
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_browser_content",
        description: "현재 활성화된 브라우저 탭의 HTML 콘텐츠를 읽어옵니다.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "추출할 DOM 셀렉터 (선택사항, 기본값: body)",
            },
          },
        },
      },
      {
        name: "execute_script",
        description: "브라우저에서 JavaScript 코드를 실행합니다.",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "실행할 JavaScript 코드",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "ping_extension",
        description: "Chrome Extension과의 연결 상태를 확인합니다.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "save_to_csv",
        description: "데이터를 CSV 파일로 저장합니다. 배열 형태의 데이터를 받아 CSV로 변환합니다.",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "저장할 파일명 (예: leads.csv). 경로를 지정하지 않으면 바탕화면에 저장됩니다.",
            },
            data: {
              type: "array",
              description: "저장할 데이터 배열. 각 항목은 객체 형태여야 합니다.",
              items: {
                type: "object",
              },
            },
            append: {
              type: "boolean",
              description: "true면 기존 파일에 추가, false면 덮어쓰기 (기본값: false)",
            },
          },
          required: ["filename", "data"],
        },
      },
      {
        name: "save_to_json",
        description: "데이터를 JSON 파일로 저장합니다.",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "저장할 파일명 (예: data.json)",
            },
            data: {
              type: "object",
              description: "저장할 데이터 (객체 또는 배열)",
            },
          },
          required: ["filename", "data"],
        },
      },
      {
        name: "scroll_page",
        description: "브라우저 페이지를 스크롤합니다.",
        inputSchema: {
          type: "object",
          properties: {
            direction: {
              type: "string",
              enum: ["down", "up", "bottom", "top"],
              description: "스크롤 방향",
            },
            amount: {
              type: "number",
              description: "스크롤할 픽셀 수 (direction이 down/up일 때만 사용)",
            },
          },
          required: ["direction"],
        },
      },
      {
        name: "click_element",
        description: "특정 CSS 셀렉터의 요소를 클릭합니다.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "클릭할 요소의 CSS 셀렉터",
            },
            waitAfter: {
              type: "number",
              description: "클릭 후 대기할 밀리초 (기본값: 1000)",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "wait_for_element",
        description: "특정 요소가 나타날 때까지 대기합니다.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "대기할 요소의 CSS 셀렉터",
            },
            timeout: {
              type: "number",
              description: "최대 대기 시간(밀리초, 기본값: 10000)",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "extract_structured_data",
        description: "반복되는 요소들에서 구조화된 데이터를 추출합니다. 예: 업체 리스트에서 이름, 전화번호, 주소를 배열로 추출.",
        inputSchema: {
          type: "object",
          properties: {
            containerSelector: {
              type: "string",
              description: "반복되는 각 항목의 컨테이너 셀렉터 (예: '.business-item')",
            },
            fields: {
              type: "object",
              description: "추출할 필드 정의. key는 필드명, value는 컨테이너 내 상대 셀렉터 (예: { name: '.business-name', phone: '.business-phone' })",
              additionalProperties: {
                type: "string",
              },
            },
            limit: {
              type: "number",
              description: "최대 추출 개수 (기본값: 전체)",
            },
          },
          required: ["containerSelector", "fields"],
        },
      },
      {
        name: "get_current_url",
        description: "현재 브라우저 탭의 URL을 가져옵니다.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_dom_snapshot",
        description: "AI 분석을 위해 현재 페이지의 DOM 구조(주요 태그와 텍스트)를 가져옵니다. 불필요한 태그는 제거됩니다.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "navigate_to",
        description: "브라우저를 특정 URL로 이동시킵니다.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "이동할 URL",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// Tool 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const needsExtension = !['save_to_csv', 'save_to_json'].includes(name);
  
  if (needsExtension && (!extensionSocket || extensionSocket.readyState !== 1)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Chrome Extension이 연결되지 않았습니다. 확장 프로그램을 설치하고 활성화해주세요.",
        },
      ],
    };
  }

  switch (name) {
    case "ping_extension": {
      extensionSocket.send(JSON.stringify({ type: 'ping' }));
      return {
        content: [
          {
            type: "text",
            text: "Ping sent to Chrome Extension. Check browser console for response.",
          },
        ],
      };
    }

    case "read_browser_content": {
      const selector = args.selector || "body";
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'content') {
            extensionSocket.off('message', messageHandler);
            resolve({
              content: [
                {
                  type: "text",
                  text: `Content from selector "${selector}":\n\n${response.data}`,
                },
              ],
            });
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'read_content', 
          selector 
        }));

        // 타임아웃 (10초)
        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [
              {
                type: "text",
                text: "Timeout: 브라우저로부터 응답을 받지 못했습니다.",
              },
            ],
          });
        }, 10000);
      });
    }

    case "execute_script": {
      const { code } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'script_result') {
            extensionSocket.off('message', messageHandler);
            resolve({
              content: [
                {
                  type: "text",
                  text: `Script executed. Result:\n${JSON.stringify(response.result, null, 2)}`,
                },
              ],
            });
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'execute_script', 
          code 
        }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [
              {
                type: "text",
                text: "Timeout: 스크립트 실행 결과를 받지 못했습니다.",
              },
            ],
          });
        }, 10000);
      });
    }

    case "save_to_csv": {
      const { filename, data, append = false } = args;
      
      try {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const filePath = filename.includes('/') ? filename : path.join(desktopPath, filename);
        
        if (!Array.isArray(data) || data.length === 0) {
          return {
            content: [{ type: "text", text: "Error: data must be a non-empty array" }],
          };
        }

        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        if (!append || !fs.existsSync(filePath)) {
          csvRows.push(headers.join(','));
        }
        
        for (const row of data) {
          const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvRows.push(values.join(','));
        }
        
        const csvContent = csvRows.join('\n') + '\n';
        
        if (append && fs.existsSync(filePath)) {
          fs.appendFileSync(filePath, csvContent, 'utf8');
        } else {
          fs.writeFileSync(filePath, csvContent, 'utf8');
        }
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully saved ${data.length} rows to ${filePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error saving CSV: ${error.message}`,
            },
          ],
        };
      }
    }

    case "save_to_json": {
      const { filename, data } = args;
      
      try {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const filePath = filename.includes('/') ? filename : path.join(desktopPath, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        return {
          content: [
            {
              type: "text",
              text: `✅ Successfully saved data to ${filePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error saving JSON: ${error.message}`,
            },
          ],
        };
      }
    }

    case "scroll_page": {
      const { direction, amount = 500 } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'scroll_result') {
            extensionSocket.off('message', messageHandler);
            resolve({
              content: [
                {
                  type: "text",
                  text: `✅ Scrolled ${direction}${amount ? ` by ${amount}px` : ''}`,
                },
              ],
            });
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'scroll_page', 
          direction,
          amount
        }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: "Timeout: scroll operation" }],
          });
        }, 5000);
      });
    }

    case "click_element": {
      const { selector, waitAfter = 1000 } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'click_result') {
            extensionSocket.off('message', messageHandler);
            
            if (response.success) {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `✅ Clicked element: ${selector}`,
                  },
                ],
              });
            } else {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `❌ Failed to click: ${response.error}`,
                  },
                ],
              });
            }
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'click_element', 
          selector,
          waitAfter
        }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: "Timeout: click operation" }],
          });
        }, 10000);
      });
    }

    case "wait_for_element": {
      const { selector, timeout = 10000 } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'wait_result') {
            extensionSocket.off('message', messageHandler);
            
            if (response.success) {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `✅ Element found: ${selector}`,
                  },
                ],
              });
            } else {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `❌ Element not found: ${selector}`,
                  },
                ],
              });
            }
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'wait_for_element', 
          selector,
          timeout
        }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: `Timeout: element ${selector} not found` }],
          });
        }, timeout + 1000);
      });
    }

    case "extract_structured_data": {
      const { containerSelector, fields, limit } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'extracted_data') {
            extensionSocket.off('message', messageHandler);
            
            if (response.success) {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `✅ Extracted ${response.data.length} items:\n${JSON.stringify(response.data, null, 2)}`,
                  },
                ],
              });
            } else {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `❌ Extraction failed: ${response.error}`,
                  },
                ],
              });
            }
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'extract_structured_data', 
          containerSelector,
          fields,
          limit
        }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: "Timeout: data extraction" }],
          });
        }, 15000);
      });
    }

    case "get_current_url": {
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'current_url') {
            extensionSocket.off('message', messageHandler);
            resolve({
              content: [
                {
                  type: "text",
                  text: `Current URL: ${response.url}`,
                },
              ],
            });
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ type: 'get_current_url' }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: "Timeout: get_current_url" }],
          });
        }, 5000);
      });
    }

    case "get_dom_snapshot": {
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'dom_snapshot') {
            extensionSocket.off('message', messageHandler);
            resolve({
              content: [
                {
                  type: "text",
                  text: `DOM Snapshot:\n${response.html}`,
                },
              ],
            });
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ type: 'get_dom_snapshot' }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: "Timeout: get_dom_snapshot" }],
          });
        }, 10000);
      });
    }

    case "navigate_to": {
      const { url } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'navigation_result') {
            extensionSocket.off('message', messageHandler);
            
            if (response.success) {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `✅ Navigated to: ${url}`,
                  },
                ],
              });
            } else {
              resolve({
                content: [
                  {
                    type: "text",
                    text: `❌ Navigation failed: ${response.error}`,
                  },
                ],
              });
            }
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ type: 'navigate_to', url }));

        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [{ type: "text", text: "Timeout: navigation" }],
          });
        }, 30000);
      });
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
      };
  }
});

// 서버 시작
async function main() {
  console.error('[MCP] Starting Phantom Agent MCP Server...');
  console.error('[MCP] WebSocket server listening on ws://localhost:8765');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[MCP] MCP Server ready. Waiting for Chrome Extension connection...');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
