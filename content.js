class WebHighlighter {
  constructor() {
    this.highlights = [];
    this.currentUrl = this.normalizeUrl(window.location.href);
    this.storageKey = `highlights_${this.currentUrl}`;
    this.isRestoring = false;
    this.init();
  }

  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (e) {
      console.warn('[Highlighter] URL parse error:', e);
      return url;
    }
  }

  init() {
    this.setupMessageListener();
    this.setupClickListener();
    this.setupMutationObserver();

    if (document.readyState === 'complete') {
      // Add small delay to ensure dynamic content is rendered
      setTimeout(() => this.loadHighlights(), 1000);
    } else {
      window.addEventListener('load', () => {
        // Add small delay to ensure dynamic content is rendered
        setTimeout(() => this.loadHighlights(), 1000);
      });
    }
  }

  setupMutationObserver() {
    // Debounce timer to avoid too frequent restoration
    let debounceTimer = null;
    
    const observer = new MutationObserver((mutations) => {
      // Check if any mutations added new nodes
      const hasNewNodes = mutations.some(mutation => 
        mutation.addedNodes.length > 0 && 
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE && 
          node.textContent.trim().length > 0
        )
      );

      if (hasNewNodes && !this.isRestoring) {
        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        // Wait 500ms after last DOM change before restoring
        debounceTimer = setTimeout(() => {
          this.restoreHighlights();
        }, 500);
      }
    });

    // Observe the entire document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setupClickListener() {
    document.addEventListener('click', (e) => {
      if (e.ctrlKey) {
        let target = e.target;
        while (target && target !== document.body) {
          if (target.classList && target.classList.contains('web-highlight')) {
            e.preventDefault();
            e.stopPropagation();
            const id = target.getAttribute('data-highlight-id');
            if (id) {
              this.removeHighlightById(id);
            }
            return;
          }
          target = target.parentElement;
        }
      }
    }, true);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'highlight') {
        this.highlightSelection(request.color);
      } else if (request.action === 'removeHighlight') {
        this.removeHighlightUnderSelection();
      } else if (request.action === 'reloadHighlights') {
        this.loadHighlights();
      }
    });
  }

  // --- Text node walker utilities ---

  getTextNodes(root) {
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    return textNodes;
  }

  getAbsoluteOffset(container, offsetInNode) {
    const textNodes = this.getTextNodes(document.body);
    let charCount = 0;
    for (const tn of textNodes) {
      if (tn === container) {
        return charCount + offsetInNode;
      }
      charCount += tn.textContent.length;
    }
    return -1;
  }

  findNodeAndOffsetAtPosition(absoluteOffset) {
    const textNodes = this.getTextNodes(document.body);
    let charCount = 0;
    for (const tn of textNodes) {
      const len = tn.textContent.length;
      if (charCount + len > absoluteOffset) {
        return { node: tn, offset: absoluteOffset - charCount };
      }
      charCount += len;
    }
    return null;
  }

  // --- Highlight creation ---

  highlightSelection(color) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    const startAbsolute = this.getAbsoluteOffset(range.startContainer, range.startOffset);
    const endAbsolute = this.getAbsoluteOffset(range.endContainer, range.endOffset);

    if (startAbsolute === -1 || endAbsolute === -1) return;

    const bodyText = document.body.textContent;
    const prefix = bodyText.substring(Math.max(0, startAbsolute - 30), startAbsolute);
    const suffix = bodyText.substring(endAbsolute, Math.min(bodyText.length, endAbsolute + 30));

    const highlightData = {
      id: this.generateId(),
      text: selectedText,
      color: color,
      timestamp: Date.now(),
      startOffset: startAbsolute,
      endOffset: endAbsolute,
      prefix: prefix,
      suffix: suffix
    };

    this.applyHighlightFromRange(range, highlightData);
    this.highlights.push(highlightData);
    this.saveHighlights();

    selection.removeAllRanges();
  }

  applyHighlightFromRange(range, highlightData) {
    try {
      const span = document.createElement('span');
      span.className = `web-highlight web-highlight-${highlightData.color}`;
      span.setAttribute('data-highlight-id', highlightData.id);

      try {
        range.surroundContents(span);
      } catch (e) {
        this.highlightRangeComplex(range, highlightData);
      }
    } catch (e) {
      console.warn('[Highlighter] Apply failed:', e);
    }
  }

  highlightRangeComplex(range, highlightData) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while ((node = walker.nextNode())) {
      if (range.intersectsNode(node)) {
        textNodes.push(node);
      }
    }

    textNodes.forEach(textNode => {
      const nodeRange = document.createRange();

      if (textNode === range.startContainer) {
        nodeRange.setStart(textNode, range.startOffset);
      } else {
        nodeRange.setStart(textNode, 0);
      }

      if (textNode === range.endContainer) {
        nodeRange.setEnd(textNode, range.endOffset);
      } else {
        nodeRange.setEnd(textNode, textNode.textContent.length);
      }

      if (nodeRange.toString().length > 0) {
        const span = document.createElement('span');
        span.className = `web-highlight web-highlight-${highlightData.color}`;
        span.setAttribute('data-highlight-id', highlightData.id);

        nodeRange.surroundContents(span);
      }
    });
  }

  // --- Highlight removal ---

  removeHighlightUnderSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    let foundHighlight = null;
    let element = range.startContainer;
    
    if (element.nodeType === 3) {
      element = element.parentElement;
    }
    
    while (element && element !== document.body && !foundHighlight) {
      if (element.classList && element.classList.contains('web-highlight')) {
        foundHighlight = element;
        break;
      }
      element = element.parentElement;
    }
    
    if (!foundHighlight && range.commonAncestorContainer) {
      const container = range.commonAncestorContainer.nodeType === 3 
        ? range.commonAncestorContainer.parentElement 
        : range.commonAncestorContainer;
      
      const highlights = container.querySelectorAll('.web-highlight');
      for (const hl of highlights) {
        if (range.intersectsNode(hl)) {
          foundHighlight = hl;
          break;
        }
      }
    }

    if (foundHighlight) {
      const id = foundHighlight.getAttribute('data-highlight-id');
      if (id) {
        this.removeHighlightById(id);
        selection.removeAllRanges();
      }
    }
  }

  removeHighlightById(id) {
    const elements = document.querySelectorAll(`[data-highlight-id="${id}"]`);
    elements.forEach(element => {
      const parent = element.parentNode;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      parent.removeChild(element);
      parent.normalize();
    });

    this.highlights = this.highlights.filter(h => h.id !== id);
    this.saveHighlights();
  }

  // --- Persistence ---

  saveHighlights() {
    const data = {};
    data[this.storageKey] = this.highlights;
    chrome.storage.sync.set(data).catch(() => {
      chrome.storage.local.set(data);
    });
  }

  async loadHighlights() {
    try {
      // Try sync storage first
      const syncResult = await chrome.storage.sync.get([this.storageKey]);
      
      if (syncResult[this.storageKey] && syncResult[this.storageKey].length > 0) {
        this.highlights = syncResult[this.storageKey];
        this.restoreHighlights();
        return;
      }

      // Fallback to local storage
      const localResult = await chrome.storage.local.get([this.storageKey]);
      
      if (localResult[this.storageKey] && localResult[this.storageKey].length > 0) {
        this.highlights = localResult[this.storageKey];
        this.restoreHighlights();
        return;
      }
    } catch (error) {
      console.warn('[Highlighter] Load error:', error);
    }
  }

  restoreHighlights() {
    this.isRestoring = true;

    // First pass: find all ranges WITHOUT modifying DOM
    const rangesToApply = [];
    
    for (const highlightData of this.highlights) {
      try {
        if (document.querySelector(`[data-highlight-id="${highlightData.id}"]`)) {
          continue;
        }

        let range = this.findRangeByOffset(highlightData);

        if (!range) {
          range = this.findRangeByTextSearch(highlightData);
        }

        if (range) {
          rangesToApply.push({ range, highlightData });
        } else {
          console.warn('[Highlighter] Could not restore:', highlightData.text.substring(0, 40));
        }
      } catch (e) {
        console.warn('[Highlighter] Restore error:', e);
      }
    }

    // Second pass: apply all highlights in reverse order (highest offset first)
    // This prevents offset invalidation
    rangesToApply.sort((a, b) => b.highlightData.startOffset - a.highlightData.startOffset);
    
    for (const { range, highlightData } of rangesToApply) {
      try {
        this.applyHighlightFromRange(range, highlightData);
      } catch (e) {
        console.warn('[Highlighter] Apply error:', e);
      }
    }

    this.isRestoring = false;
  }

  findRangeByOffset(highlightData) {
    const startPos = this.findNodeAndOffsetAtPosition(highlightData.startOffset);
    const endPos = this.findNodeAndOffsetAtPosition(highlightData.endOffset);

    if (!startPos || !endPos) return null;

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);

    const rangeText = range.toString();
    if (rangeText === highlightData.text) {
      return range;
    }

    return null;
  }

  findRangeByTextSearch(highlightData) {
    const searchText = highlightData.text;
    if (!searchText || searchText.length === 0) return null;

    const textNodes = this.getTextNodes(document.body);
    let fullText = '';
    const nodeMap = [];

    for (const tn of textNodes) {
      const start = fullText.length;
      fullText += tn.textContent;
      nodeMap.push({ node: tn, start: start, end: fullText.length });
    }

    let bestIndex = -1;

    // Strategy 1: Try exact match with prefix
    if (highlightData.prefix && bestIndex === -1) {
      const prefixSearch = highlightData.prefix + searchText;
      const prefixIdx = fullText.indexOf(prefixSearch);
      if (prefixIdx !== -1) {
        bestIndex = prefixIdx + highlightData.prefix.length;
      }
    }

    // Strategy 2: Try exact match with suffix
    if (highlightData.suffix && bestIndex === -1) {
      const suffixSearch = searchText + highlightData.suffix;
      const suffixIdx = fullText.indexOf(suffixSearch);
      if (suffixIdx !== -1) {
        bestIndex = suffixIdx;
      }
    }

    // Strategy 3: Try exact text match
    if (bestIndex === -1) {
      bestIndex = fullText.indexOf(searchText);
    }

    // Strategy 4: Try normalized text (remove extra whitespace)
    if (bestIndex === -1) {
      const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
      const normalizedFull = fullText.replace(/\s+/g, ' ');
      const normIdx = normalizedFull.indexOf(normalizedSearch);
      if (normIdx !== -1) {
        // Map back to original text position
        let origPos = 0;
        let normPos = 0;
        while (normPos < normIdx && origPos < fullText.length) {
          if (/\s/.test(fullText[origPos])) {
            origPos++;
            if (!/\s/.test(fullText[origPos - 1]) || normPos === 0) continue;
            normPos++;
          } else {
            origPos++;
            normPos++;
          }
        }
        bestIndex = origPos;
      }
    }

    // Strategy 5: Try partial match (first 20 chars)
    if (bestIndex === -1 && searchText.length > 20) {
      const partialSearch = searchText.substring(0, 20);
      const partialIdx = fullText.indexOf(partialSearch);
      if (partialIdx !== -1) {
        bestIndex = partialIdx;
      }
    }

    if (bestIndex === -1) return null;

    const startAbsolute = bestIndex;
    const endAbsolute = bestIndex + searchText.length;

    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;

    for (const entry of nodeMap) {
      if (!startNode && entry.end > startAbsolute) {
        startNode = entry.node;
        startOffset = startAbsolute - entry.start;
      }
      if (entry.end >= endAbsolute) {
        endNode = entry.node;
        endOffset = endAbsolute - entry.start;
        break;
      }
    }

    if (!startNode || !endNode) return null;

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    return range;
  }

  // --- Utilities ---

  generateId() {
    return 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

const highlighter = new WebHighlighter();
