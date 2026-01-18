document.getElementById('reconnect').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'reconnect' }, (response) => {
    if (response && response.success) {
      updateStatus(true);
    }
  });
});

function updateStatus(connected) {
  const statusEl = document.getElementById('status');
  if (connected) {
    statusEl.className = 'status connected';
    statusEl.textContent = '🟢 Connected to MCP Server';
  } else {
    statusEl.className = 'status disconnected';
    statusEl.textContent = '🔴 Not Connected to MCP Server';
  }
}

chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response && response.connected) {
    updateStatus(true);
  }
});
