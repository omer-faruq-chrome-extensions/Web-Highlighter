let currentColor = 'yellow';

document.addEventListener('DOMContentLoaded', async () => {
  loadCurrentColor();
  setupColorButtons();
  setupSyncButtons();
  setupAutoSync();
  updateStats();

  if (window.highlightSync) {
    await window.highlightSync.waitReady();
  }
  updateSyncStatus();
  
  // Add click handler to total highlights count
  document.getElementById('totalHighlights').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('highlights-summary.html') });
  });
});

function loadCurrentColor() {
  chrome.storage.sync.get(['selectedColor'], (result) => {
    if (result.selectedColor) {
      currentColor = result.selectedColor;
      updateActiveButton(currentColor);
    } else {
      updateActiveButton('yellow');
    }
  });
}

function setupColorButtons() {
  const colorButtons = document.querySelectorAll('.color-btn');
  
  colorButtons.forEach(button => {
    button.addEventListener('click', () => {
      const color = button.getAttribute('data-color');
      currentColor = color;
      
      chrome.storage.sync.set({ selectedColor: color });
      
      chrome.runtime.sendMessage({
        action: 'setColor',
        color: color
      });
      
      updateActiveButton(color);
    });
  });
}

function updateActiveButton(color) {
  const colorButtons = document.querySelectorAll('.color-btn');
  colorButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-color') === color) {
      btn.classList.add('active');
    }
  });
}

function setupSyncButtons() {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  exportBtn.addEventListener('click', exportHighlights);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importHighlights);
}

function exportHighlights() {
  chrome.runtime.sendMessage({ action: 'exportHighlights' }, (response) => {
    if (response && response.highlights) {
      const dataStr = JSON.stringify(response.highlights, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `web-highlighter-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      showNotification('Highlights exported!', 'success');
    }
  });
}

function importHighlights(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const highlights = JSON.parse(e.target.result);
      
      chrome.runtime.sendMessage({
        action: 'importHighlights',
        highlights: highlights
      }, (response) => {
        if (response && response.success) {
          showNotification('Highlights imported! Refresh the page.', 'success');
          updateStats();
        }
      });
    } catch (error) {
      showNotification('Invalid file format!', 'error');
    }
  };
  
  reader.readAsText(file);
  event.target.value = '';
}

function updateStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = normalizeUrl(tabs[0].url);
      const storageKey = `highlights_${url}`;
      
      chrome.storage.sync.get([storageKey], (result) => {
        const pageCount = result[storageKey] ? result[storageKey].length : 0;
        document.getElementById('pageHighlights').textContent = pageCount;
      });
    }
  });

  chrome.storage.sync.get(null, (items) => {
    let totalCount = 0;
    for (const key in items) {
      if (key.startsWith('highlights_') && Array.isArray(items[key])) {
        totalCount += items[key].length;
      }
    }
    document.getElementById('totalHighlights').textContent = totalCount;
  });
}

function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch (e) {
    return url;
  }
}

function setupAutoSync() {
  // Sync is automatic via Chrome account - no setup needed
}

async function updateSyncStatus() {
  if (!window.highlightSync) return;

  const status = await window.highlightSync.getSyncStatus();
  const syncStatusDiv = document.getElementById('syncStatus');
  const syncStatusText = syncStatusDiv.querySelector('.sync-status-text');

  if (status.signedIn) {
    syncStatusDiv.classList.add('active');
    syncStatusDiv.classList.remove('warning');
    syncStatusText.textContent = '✓ ' + status.message;
  } else {
    syncStatusDiv.classList.add('warning');
    syncStatusDiv.classList.remove('active');
    syncStatusText.textContent = '⚠ ' + status.message;
  }
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${type === 'success' ? '#4caf50' : '#f44336'};
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideDown 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
