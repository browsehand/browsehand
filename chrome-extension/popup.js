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
    statusEl.textContent = '🟢 MCP 서버에 연결됨';
  } else {
    statusEl.className = 'status disconnected';
    statusEl.textContent = '🔴 MCP 서버에 연결되지 않음';
  }
}

chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response && response.connected) {
    updateStatus(true);
  }
});
