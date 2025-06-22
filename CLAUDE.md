# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that automatically saves and restores form data for repeated use on web applications. The extension helps users avoid repetitive form filling by storing form data locally and re-populating it on subsequent visits.

## Architecture

The extension follows a standard Chrome Extension architecture:

- **Content Script**: Detects forms, monitors input changes, and injects saved values
- **Background Service Worker**: Handles data persistence and popup communication  
- **Suggest UI**: Floating UI component that prompts users to save form data
- **Options Page**: Management interface for saved forms and settings

## Technology Stack

- Chrome Manifest V3
- TypeScript + Vite for build system
- Lit (Web Components) for UI
- Tailwind CSS for styling
- chrome.storage.sync for data persistence

## Key Implementation Details

### Data Storage Strategy
- Key format: `<origin+path+formIndex>`
- Storage: `chrome.storage.sync` (with 100KB/item, 8MB/extension limits)
- Fallback to `chrome.storage.local` may be needed for large datasets

### Form Detection Logic
1. Monitor `input`, `textarea`, `select` elements for `change`/`input` events
2. Track "unsaved" state when user inputs data
3. Show floating UI after input pause or before form submission
4. Store data as `{ fieldName: value }` objects

### Security Considerations
- Exclude `input[type="file"]` (browser security restriction)
- Validate URL schemas to prevent HTTPS→HTTP data injection
- Password fields disabled by default (optional enable in settings)
- Local-only storage, no external server communication

## Development Commands

Since this is a new project, these commands will be available once development begins:

```bash
# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build

# Load extension in Chrome
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select dist/ folder
```

## Chrome Extension Permissions

Required permissions in manifest.json:
- `storage`: For saving form data
- `activeTab`: For accessing current page
- `host_permissions: ["<all_urls>"]`: For cross-site form detection