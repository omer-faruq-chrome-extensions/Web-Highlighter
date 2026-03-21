async function loadHighlights() {
  const content = document.getElementById('content');
  
  try {
    let items = await chrome.storage.sync.get(null);
    
    // Fallback to local storage if sync is empty
    if (Object.keys(items).length === 0) {
      items = await chrome.storage.local.get(null);
    }
    
    const highlights = {};
    let totalCount = 0;
    
    // Group highlights by URL
    for (const key in items) {
      if (key.startsWith('highlights_')) {
        const url = key.replace('highlights_', '');
        if (Array.isArray(items[key]) && items[key].length > 0) {
          highlights[url] = items[key];
          totalCount += items[key].length;
        }
      }
    }
    
    const pageCount = Object.keys(highlights).length;
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('pageCount').textContent = pageCount;
    
    if (pageCount === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h2>No highlights yet</h2>
          <p>Start highlighting text on web pages to see them here</p>
        </div>
      `;
      return;
    }
    
    // Sort by highlight count (descending)
    const sortedUrls = Object.entries(highlights)
      .sort((a, b) => b[1].length - a[1].length);
    
    const listHTML = sortedUrls.map(([url, items]) => {
      const colors = [...new Set(items.map(h => h.color))];
      const colorDots = colors.map(color => 
        `<span class="color-dot ${color}"></span>`
      ).join('');
      
      // Try to get page title from URL
      const title = getPageTitle(url);
      
      // Create individual highlight items
      const highlightsList = items.map(h => `
        <div class="individual-highlight" data-highlight-id="${h.id}">
          <div class="highlight-text">
            <span class="color-indicator ${h.color}"></span>
            <span class="text-preview">${escapeHtml(h.text.substring(0, 100))}${h.text.length > 100 ? '...' : ''}</span>
          </div>
          <button class="delete-single-btn" data-url="${url}" data-highlight-id="${h.id}" title="Delete this highlight">
            🗑️
          </button>
        </div>
      `).join('');

      return `
        <div class="highlight-item" data-url="${url}">
          <div class="highlight-header">
            <div class="highlight-title">${escapeHtml(title)}</div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="highlight-count-btn" data-url="${url}" title="Click to expand/collapse highlights">
                ${items.length} highlight${items.length > 1 ? 's' : ''} ▼
              </button>
              <button class="delete-btn" data-url="${url}" title="Delete all highlights for this page">
                🗑️ Delete All
              </button>
            </div>
          </div>
          <a href="${escapeHtml(url)}" class="highlight-url" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(url)}
          </a>
          <div class="highlight-meta">
            <div class="meta-item">
              <span>Colors:</span>
              <div class="color-dots">${colorDots}</div>
            </div>
          </div>
          <div class="highlights-detail" style="display: none;">
            ${highlightsList}
          </div>
        </div>
      `;
    }).join('');
    
    content.innerHTML = `<div class="highlights-list">${listHTML}</div>`;
    
    // Add event listeners to delete all buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.getAttribute('data-url');
        deleteAllHighlights(url);
      });
    });

    // Add event listeners to expand/collapse buttons
    document.querySelectorAll('.highlight-count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const item = btn.closest('.highlight-item');
        const detail = item.querySelector('.highlights-detail');
        const isExpanded = detail.style.display !== 'none';
        
        detail.style.display = isExpanded ? 'none' : 'block';
        btn.innerHTML = btn.innerHTML.replace(isExpanded ? '▲' : '▼', isExpanded ? '▼' : '▲');
      });
    });

    // Add event listeners to individual delete buttons
    document.querySelectorAll('.delete-single-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.getAttribute('data-url');
        const highlightId = btn.getAttribute('data-highlight-id');
        deleteSingleHighlight(url, highlightId);
      });
    });

    // Setup filters
    setupFilters();
    
  } catch (error) {
    console.error('[Summary] Error:', error);
    content.innerHTML = `
      <div class="empty-state">
        <h2>Error loading highlights</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

function getPageTitle(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname;
    
    if (path === '/' || path === '') {
      return hostname;
    }
    
    // Try to extract meaningful title from path
    const parts = path.split('/').filter(p => p);
    const lastPart = parts[parts.length - 1];
    
    if (lastPart) {
      const cleaned = lastPart
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]+$/, '') // Remove extension
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize
      return `${cleaned} - ${hostname}`;
    }
    
    return hostname;
  } catch (e) {
    return url;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function deleteAllHighlights(url) {
  if (!confirm(`Delete all highlights for this page?\n\n${url}`)) {
    return;
  }

  try {
    const storageKey = `highlights_${url}`;
    
    // Try sync storage first
    await chrome.storage.sync.remove(storageKey);
    // Also try local storage
    await chrome.storage.local.remove(storageKey);
    
    // Reload to get accurate counts and refresh UI
    loadHighlights();
    
  } catch (error) {
    console.error('[Summary] Delete error:', error);
    alert('Error deleting highlights: ' + error.message);
  }
}

async function deleteSingleHighlight(url, highlightId) {
  if (!confirm('Delete this highlight?')) {
    return;
  }

  try {
    const storageKey = `highlights_${url}`;
    
    // Get current highlights
    let items = await chrome.storage.sync.get(storageKey);
    if (!items[storageKey]) {
      items = await chrome.storage.local.get(storageKey);
    }
    
    if (items[storageKey]) {
      // Filter out the highlight to delete
      const updatedHighlights = items[storageKey].filter(h => h.id !== highlightId);
      
      if (updatedHighlights.length === 0) {
        // If no highlights left, remove the key entirely
        await chrome.storage.sync.remove(storageKey);
        await chrome.storage.local.remove(storageKey);
      } else {
        // Update with remaining highlights
        const data = {};
        data[storageKey] = updatedHighlights;
        await chrome.storage.sync.set(data).catch(() => {
          chrome.storage.local.set(data);
        });
      }
      
      // Reload to refresh UI
      loadHighlights();
    }
    
  } catch (error) {
    console.error('[Summary] Delete single error:', error);
    alert('Error deleting highlight: ' + error.message);
  }
}

function setupFilters() {
  const urlFilter = document.getElementById('urlFilter');
  const textFilter = document.getElementById('textFilter');

  if (!urlFilter || !textFilter) return;

  const applyFilters = () => {
    const urlQuery = urlFilter.value.toLowerCase().trim();
    const textQuery = textFilter.value.toLowerCase().trim();

    const items = document.querySelectorAll('.highlight-item');
    let visibleCount = 0;

    items.forEach(item => {
      const url = item.getAttribute('data-url').toLowerCase();
      const title = item.querySelector('.highlight-title').textContent.toLowerCase();
      
      // Check URL/title filter
      const matchesUrl = !urlQuery || url.includes(urlQuery) || title.includes(urlQuery);

      // Check text filter in individual highlights
      let matchesText = !textQuery;
      if (textQuery) {
        const highlights = item.querySelectorAll('.text-preview');
        matchesText = Array.from(highlights).some(h => 
          h.textContent.toLowerCase().includes(textQuery)
        );
      }

      // Show/hide item based on filters
      if (matchesUrl && matchesText) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });

    // Update visible count indicator
    updateFilterStats(visibleCount, items.length);
  };

  urlFilter.addEventListener('input', applyFilters);
  textFilter.addEventListener('input', applyFilters);
}

function updateFilterStats(visible, total) {
  const pageCountEl = document.getElementById('pageCount');
  if (visible === total) {
    pageCountEl.textContent = total;
  } else {
    pageCountEl.textContent = `${visible} / ${total}`;
  }
}

// Load highlights on page load
loadHighlights();
