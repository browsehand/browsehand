console.log('[Phantom Content] Script loaded on:', window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Phantom Content] Received message:', request);

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
      const { direction, amount } = request;
      
      if (direction === 'bottom') {
        window.scrollTo(0, document.body.scrollHeight);
      } else if (direction === 'top') {
        window.scrollTo(0, 0);
      } else if (direction === 'up') {
        window.scrollBy(0, -amount);
      } else {
        // default down
        window.scrollBy(0, amount);
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
        
        // 클릭 후 대기 (옵션)
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
    return true; // 비동기 응답을 위해 true 반환
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
      // AI가 분석하기 좋게 HTML을 단순화해서 리턴
      // 1. 눈에 보이는 요소만 (visibility check) - 여기선 생략하고 구조만
      // 2. 너무 긴 텍스트는 자름
      // 3. 불필요한 태그(script, style) 제거
      
      const clone = document.body.cloneNode(true);
      
      // 불필요한 태그 제거
      const toRemove = clone.querySelectorAll('script, style, noscript, svg, path, link, meta, iframe');
      toRemove.forEach(el => el.remove());
      
      // 주석 제거 및 속성 정리 (class, id만 남김)
      const cleanAttributes = (node) => {
        if (node.nodeType === 1) { // Element
          const keepAttrs = ['id', 'class', 'role', 'aria-label', 'data-index'];
          const attrs = [...node.attributes];
          attrs.forEach(attr => {
            if (!keepAttrs.includes(attr.name)) {
              node.removeAttribute(attr.name);
            }
          });
          // 자식들도 재귀적으로
          Array.from(node.children).forEach(cleanAttributes);
        }
      };
      cleanAttributes(clone);

      // HTML 문자열로 변환 (너무 길면 자름)
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
