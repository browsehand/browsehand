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

// WebSocket Server (Communication with Chrome Extension)
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

  // Send connection confirmation message
  ws.send(JSON.stringify({ type: 'hello', message: 'MCP Server Connected!' }));
});

// Initialize MCP Server
const server = new Server(
  {
    name: "browsehand",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define MCP Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_browser_content",
        description: "Reads HTML content from the currently active browser tab.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "DOM selector to extract (optional, default: body)",
            },
          },
        },
      },
      {
        name: "execute_script",
        description: "Executes JavaScript code in the browser.",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "JavaScript code to execute",
            },
          },
          required: ["code"],
        },
      },
      {
        name: "ping_extension",
        description: "Checks the connection status with the Chrome Extension.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "save_to_csv",
        description: "Saves data to a CSV file. Converts an array of objects into CSV format.",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "Filename to save (e.g., leads.csv). Saves to Desktop if no path is specified.",
            },
            data: {
              type: "array",
              description: "Array of data to save. Each item must be an object.",
              items: {
                type: "object",
              },
            },
            append: {
              type: "boolean",
              description: "If true, appends to existing file. If false, overwrites (default: false).",
            },
          },
          required: ["filename", "data"],
        },
      },
      {
        name: "save_to_json",
        description: "Saves data to a JSON file.",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "Filename to save (e.g., data.json)",
            },
            data: {
              type: "object",
              description: "Data to save (object or array)",
            },
          },
          required: ["filename", "data"],
        },
      },
      {
        name: "scroll_page",
        description: "Scrolls the browser page or a specific element.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector of the element to scroll (scrolls entire page if not specified)",
            },
            direction: {
              type: "string",
              enum: ["down", "up", "bottom", "top"],
              description: "Scroll direction",
            },
            amount: {
              type: "number",
              description: "Number of pixels to scroll (only used when direction is down/up)",
            },
          },
          required: ["direction"],
        },
      },
      {
        name: "click_element",
        description: "Clicks an element specified by CSS selector.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector of the element to click",
            },
            waitAfter: {
              type: "number",
              description: "Milliseconds to wait after clicking (default: 1000)",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "wait_for_element",
        description: "Waits until a specific element appears.",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector of the element to wait for",
            },
            timeout: {
              type: "number",
              description: "Maximum wait time in milliseconds (default: 10000)",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "extract_structured_data",
        description: "Extracts structured data from repeating elements. e.g., Extract name, phone, address from a business list.",
        inputSchema: {
          type: "object",
          properties: {
            containerSelector: {
              type: "string",
              description: "Container selector for each repeating item (e.g., '.business-item')",
            },
            fields: {
              type: "object",
              description: "Field definitions to extract. key is field name, value is relative selector within container (e.g., { name: '.business-name', phone: '.business-phone' })",
              additionalProperties: {
                type: "string",
              },
            },
            limit: {
              type: "number",
              description: "Maximum number of items to extract (default: all)",
            },
          },
          required: ["containerSelector", "fields"],
        },
      },
      {
        name: "get_current_url",
        description: "Gets the URL of the current browser tab.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_dom_snapshot",
        description: "Gets the DOM structure (main tags and text) of the current page for AI analysis. Unnecessary tags are removed.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "navigate_to",
        description: "Navigates the browser to a specific URL.",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to navigate to",
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// Tool Execution Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const needsExtension = !['save_to_csv', 'save_to_json'].includes(name);
  
  if (needsExtension && (!extensionSocket || extensionSocket.readyState !== 1)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Chrome Extension is not connected. Please install and enable the extension.",
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

        // Timeout (10 seconds)
        setTimeout(() => {
          extensionSocket.off('message', messageHandler);
          resolve({
            content: [
              {
                type: "text",
                text: "Timeout: No response received from browser.",
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
                text: "Timeout: No script execution result received.",
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
      const { direction, amount = 500, selector } = args;
      
      return new Promise((resolve) => {
        const messageHandler = (data) => {
          const response = JSON.parse(data.toString());
          if (response.type === 'scroll_result') {
            extensionSocket.off('message', messageHandler);
            resolve({
              content: [
                {
                  type: "text",
                  text: `✅ Scrolled ${selector ? `element '${selector}'` : 'page'} ${direction}${amount ? ` by ${amount}px` : ''}`,
                },
              ],
            });
          }
        };

        extensionSocket.on('message', messageHandler);
        extensionSocket.send(JSON.stringify({ 
          type: 'scroll_page', 
          direction,
          amount,
          selector
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

// Start Server
async function main() {
  console.error('[MCP] Starting BrowseHand MCP Server...');
  console.error('[MCP] WebSocket server listening on ws://localhost:8765');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[MCP] MCP Server ready. Waiting for Chrome Extension connection...');
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
