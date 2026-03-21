let currentColor = 'yellow';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'highlight-yellow',
    title: 'Highlight (Yellow)',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'highlight-green',
    title: 'Highlight (Green)',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'highlight-blue',
    title: 'Highlight (Blue)',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'highlight-pink',
    title: 'Highlight (Pink)',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'highlight-orange',
    title: 'Highlight (Orange)',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'remove-highlight',
    title: 'Remove Highlight',
    contexts: ['selection']
  });
  
  chrome.storage.sync.get(['selectedColor'], (result) => {
    if (result.selectedColor) {
      currentColor = result.selectedColor;
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('highlight-')) {
    const color = info.menuItemId.replace('highlight-', '');
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'highlight',
      color: color
    });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command.startsWith('highlight-')) {
    const color = command.replace('highlight-', '');
    chrome.tabs.sendMessage(tab.id, {
      action: 'highlight',
      color: color
    });
  } else if (command === 'remove-highlight') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'removeHighlight'
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setColor') {
    currentColor = request.color;
  } else if (request.action === 'exportHighlights') {
    chrome.storage.sync.get(null, (items) => {
      const highlights = {};
      for (const key in items) {
        if (key.startsWith('highlights_')) {
          highlights[key] = items[key];
        }
      }
      sendResponse({ highlights: highlights });
    });
    return true;
  } else if (request.action === 'importHighlights') {
    chrome.storage.sync.set(request.highlights).catch(() => {
      chrome.storage.local.set(request.highlights, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  } else if (request.action === 'getColor') {
    sendResponse({ color: currentColor });
  }
});
