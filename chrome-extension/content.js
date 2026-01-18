console.log('[BrowseHand Content] Script loaded on:', window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[BrowseHand Content] Received message:', request);

  if (request.action === 'read_content') {
    try {
      const selector = request.selector || 'body';
      const element = document.querySelector(selector);
      
      if (!element) {
        sendResponse({ 
          success: false, 
          error: `Element not found: ${selector}` 
        });
        return true;
      }

      const content = element.innerText || element.textContent;
      sendResponse({ 
        success: true, 
        content: content 
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
    return true;
  }

  if (request.action === 'execute_script') {
    try {
      const result = eval(request.code);
      const serializable = (result === undefined) ? null : result;
      sendResponse({ 
        success: true, 
        result: serializable
      });
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
    return true;
  }

  if (request.action === 'scroll_page') {
    try {
      const { direction, amount, selector } = request;
      let target = window;
      let isElement = false;

      if (selector) {
        const element = document.querySelector(selector);
        if (!element) {
          throw new Error(`Scroll target not found: ${selector}`);
        }
        target = element;
        isElement = true;
      }
      
      if (direction === 'bottom') {
        if (isElement) {
          target.scrollTo(0, target.scrollHeight);
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      } else if (direction === 'top') {
        target.scrollTo(0, 0);
      } else if (direction === 'up') {
        target.scrollBy(0, -amount);
      } else {
        // default down
        target.scrollBy(0, amount);
      }
      
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'click_element') {
    try {
      const element = document.querySelector(request.selector);
      if (element) {
        element.click();
        
        // Wait after click (optional)
        if (request.waitAfter) {
          setTimeout(() => {
            sendResponse({ success: true });
          }, request.waitAfter);
        } else {
          sendResponse({ success: true });
        }
      } else {
        sendResponse({ success: false, error: 'Element not found' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // Return true for async response
  }

  if (request.action === 'wait_for_element') {
    const { selector, timeout } = request;
    
    if (document.querySelector(selector)) {
      sendResponse({ success: true });
      return true;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        sendResponse({ success: true });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
    }, timeout);

    return true;
  }

  if (request.action === 'extract_structured_data') {
    try {
      const { containerSelector, fields, limit } = request;
      const containers = document.querySelectorAll(containerSelector);
      const results = [];
      
      const maxItems = limit || containers.length;
      
      for (let i = 0; i < Math.min(containers.length, maxItems); i++) {
        const container = containers[i];
        const item = {};
        
        for (const [fieldName, fieldSelector] of Object.entries(fields)) {
          const fieldElement = container.querySelector(fieldSelector);
          item[fieldName] = fieldElement ? (fieldElement.innerText || fieldElement.textContent || '').trim() : '';
        }
        
        results.push(item);
      }
      
      sendResponse({ success: true, data: results });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'get_dom_snapshot') {
    try {
      // Return simplified HTML for AI analysis
      // 1. Omitted visibility check for now
      // 2. Truncate long texts
      // 3. Remove unnecessary tags (script, style)
      
      const clone = document.body.cloneNode(true);
      
      // Remove unnecessary tags
      const toRemove = clone.querySelectorAll('script, style, noscript, svg, path, link, meta, iframe');
      toRemove.forEach(el => el.remove());
      
      // Remove comments and clean attributes (keep only class, id, etc.)
      const cleanAttributes = (node) => {
        if (node.nodeType === 1) { // Element
          const keepAttrs = ['id', 'class', 'role', 'aria-label', 'data-index'];
          const attrs = [...node.attributes];
          attrs.forEach(attr => {
            if (!keepAttrs.includes(attr.name)) {
              node.removeAttribute(attr.name);
            }
          });
          // Recursively clean children
          Array.from(node.children).forEach(cleanAttributes);
        }
      };
      cleanAttributes(clone);

      // Convert to HTML string (truncate if too long)
      let html = clone.innerHTML;
      if (html.length > 50000) {
        html = html.substring(0, 50000) + '... (truncated)';
      }

      sendResponse({ success: true, html: html });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  return false;
});
