# Web Highlighter - Browser Extension

A powerful browser extension for Chrome and Edge that lets you highlight text on web pages, automatically save your highlights, and restore them when you revisit.

## ✨ Features

- 🎨 **5 Color Options**: Yellow, Green, Blue, Pink, and Orange
- 💾 **Auto-Save**: Your highlights are automatically saved
- 🔄 **Auto-Restore**: Highlights automatically appear when you revisit pages
- 🔗 **Cross-Browser Sync**: Share highlights between Chrome and Edge
- ⌨️ **Keyboard Shortcuts**: Quick highlighting shortcuts
- 🖱️ **Right-Click Menu**: Easy access via context menu
- 📥 **Export/Import**: Backup and restore your highlights

## 🚀 Installation

### For Chrome

1. Download or clone this repository
2. Open Chrome browser
3. Navigate to `chrome://extensions/`
4. Enable **Developer mode** in the top right corner
5. Click **Load unpacked**
6. Select the `Highlighter` folder you downloaded

### For Edge

1. Download or clone this repository
2. Open Edge browser
3. Navigate to `edge://extensions/`
4. Enable **Developer mode** in the bottom left
5. Click **Load unpacked**
6. Select the `Highlighter` folder you downloaded

### Creating Icons

To generate extension icons:

1. Open `icons/create-icons.html` in your browser
2. Right-click each canvas and select "Save image as"
3. Save files to the `icons` folder with these names:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

## 📖 Usage

### Highlighting Text

**Method 1: Right-Click Menu**
1. Select the text you want to highlight
2. Right-click
3. Choose a color from the "Highlight" menu

**Method 2: Keyboard Shortcuts**
- `Ctrl+Shift+H` - Highlight with yellow
- `Ctrl+Shift+G` - Highlight with green
- `Ctrl+Shift+B` - Highlight with blue
- `Ctrl+Shift+P` - Highlight with pink
- `Ctrl+Shift+R` - Remove highlight

**Method 3: Popup Menu**
1. Click the extension icon
2. Select your desired color
3. Select text (it will be highlighted automatically)

### Removing Highlights

- **Hold Ctrl and click** on the highlighted text (easiest method)
- OR select the highlighted text and press `Ctrl+Shift+R`
- OR select the highlighted text and right-click → "Remove Highlight"

### Auto Sync Between Chrome and Edge

Your highlights **automatically sync** via your Chrome account!

#### How It Works

1. **In Chrome:**
   - Sign in to Chrome with your Google account
   - Install the extension
   - Your highlights are automatically saved to your account

2. **In Edge:**
   - Sign in to Edge with the **same Microsoft/Google account**
   - Install the extension
   - Your highlights automatically sync

#### Features

- Zero configuration - works automatically
- No folder selection, no permission issues
- Same highlights across all your devices
- Real-time synchronization

#### Manual Backup

If you prefer not to use auto-sync, manual backup is also available:

1. **In Chrome:**
   - Click "Export" in the "Manual Backup" section
   - Save the JSON file

2. **In Edge:**
   - Click "Import" in the "Manual Backup" section
   - Select the saved JSON file
   - Refresh the page

## 🛠️ Technical Details

### File Structure

```
Highlighter/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Content script (highlighting logic)
├── highlighter.css       # Highlight styles
├── popup.html            # Popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup logic
├── sync.js               # Sync functionality
├── highlights-summary.html # All highlights summary page
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── create-icons.html
└── README.md             # This file
```

### Data Storage

- **Sync Storage**: Highlights are stored using `chrome.storage.sync` API for automatic cross-browser sync
- **Local Fallback**: Falls back to `chrome.storage.local` if sync quota is exceeded
- **Data Format**: Highlights are stored with absolute character offsets and text verification

### How It Works

1. **Highlighting**: When user selects text, Selection API captures the selection
2. **Position Calculation**: Selected text position is calculated using absolute character offsets
3. **Saving**: Highlight info (text, color, position) is saved to sync storage
4. **Restoration**: On page load, saved highlights are found using offsets and restored
5. **Synchronization**: Automatic via Chrome account, or manual via Export/Import JSON

### View All Highlights

Click on the **Total** count in the popup to open a summary page showing:
- All pages with highlights
- Number of highlights per page
- Clickable URLs to visit pages
- Color distribution

## 🎨 Color Palette

- **Yellow** (#ffeb3b) - Default, classic highlight color
- **Green** (#8bc34a) - For important information
- **Blue** (#64b5f6) - For references and links
- **Pink** (#f48fb1) - For questions and notes
- **Orange** (#ffab91) - For warnings and attention

## 🔒 Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- Export/Import works entirely through local file system
- Chrome account sync uses Google's secure infrastructure

## 🤝 Contributing

This project is open source. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Bug Reports

If you encounter any issues or have suggestions, please report them on the GitHub Issues page.

## 🌟 Inspiration

This project was inspired by the following open source projects:

- [jeromepl/highlighter](https://github.com/jeromepl/highlighter)
- [alienzhou/web-highlighter](https://github.com/alienzhou/web-highlighter)
- [Jahn08/WEB-PAGE-HIGHLIGHTER](https://github.com/Jahn08/WEB-PAGE-HIGHLIGHTER)

## 📞 Contact

For questions, feel free to open an issue or submit a pull request.

---

**Happy highlighting! 🖍️✨**
