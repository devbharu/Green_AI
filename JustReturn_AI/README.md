# Green AI  

Invisible AI overlay — completely hidden from screen sharing.  
Built with Electron + React, powered by Local LLMs via **Ollama**.

## 🚀 Setup & Starting the App

This app uses local AI models to ensure privacy. **Before starting the app, you MUST have Ollama running on your system.**

### 1. The "Ollama Sign-in" (Local Setup)
Since this app runs entirely locally, there is no traditional "sign-in" or account needed. Instead, your "sign-in" is ensuring your local Ollama server is running and configured:
1. Download and install [Ollama](https://ollama.com).
2. Open the Ollama application so it runs in the background (it automatically starts a local server on port `11434`).
3. Open your terminal and pull the models used by the app. For example:
   ```bash
   ollama run gemma:latest # Or the specific model you prefer
   ```
4. Keep the Ollama app running while you use Green AI.

### 2. Install App Dependencies
```bash
npm install
```

### 3. Run the App (Dev Mode)
```bash
npm run start
```
*This opens the Vite dev server and Electron simultaneously.*

Once launched, press `⌘;` (or `Ctrl;`) to open the settings panel. From there, you can select your Ollama model and configure system prompts.

---

## 🏗️ Architecture & Engineering Mechanisms

Green AI uses an Electron backend for powerful system-level window management and a Vite + React frontend for a highly responsive, dynamic UI.

### Full Architecture Flow

1. **Renderer (React/Vite in `src/`)**: The frontend acts as the overlay UI. 
   - It is an invisible window that captures key presses and renders markdown output dynamically.
   - It continually communicates its optimal dimensions to the main process via IPC. This allows Electron to resize the overlay window perfectly around the content without standard OS window frames.
2. **Main Process (Electron in `electron/`)**: Acts as the backend controller.
   - Manages the single invisible `BrowserWindow`.
   - Handles global keyboard shortcuts (`shortcuts.ts`).
   - Uses `desktopCapturer` to take screenshots directly from the OS.
   - Communicates with the local Ollama server (`http://localhost:11434/api/chat`) via HTTP requests.
   - Handles OCR processing (using `tesseract.js`) locally if a non-vision model is selected.
3. **IPC Bridge**: A secure `contextBridge` (`preload.ts`) safely connects the React frontend to the Electron backend capabilities.

### Stealth Engineering Mechanisms (The "Top Layer" API Breakdown)

To make the overlay work seamlessly and remain invisible, the application leverages specific **Electron APIs** that map directly to low-level **Operating System (OS) APIs**.

#### 1. Invisibility (Anti-Screen Capture)
The core invisibility is achieved with a single Electron command:
`win.setContentProtection(true)`

Under the hood, this makes low-level calls depending on your OS:
- **Windows:** Electron calls the OS API `SetWindowDisplayAffinity` and applies the `WDA_EXCLUDEFROMCAPTURE` flag. This works at the deepest level of the Windows rendering engine (the Desktop Window Manager). Because it's enforced at the compositor level, *no screen recording software* (Zoom, Teams, OBS) can physically see the window.
- **macOS:** Electron calls `[NSWindow setSharingType:NSWindowSharingNone]`. This explicitly tells macOS's rendering engine (CoreGraphics and ScreenCaptureKit) to omit this window's buffer from any screen capture streams.

#### 2. Floating Above Everything (The "Top Layer")
To ensure the window stays on top, even if you are in a full-screen application or switch virtual desktops:
- `win.setAlwaysOnTop(true, 'screen-saver', 1)`: Instructs the OS to assign the window the absolute highest Z-index possible (above normal floating windows, above the taskbar, and above full-screen apps).
- `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })`:
  - `visibleOnFullScreen`: Ensures it floats above native fullscreen apps.
  - `skipTransformProcessType`: A macOS-specific flag preventing the OS from upgrading the background app to a foreground app when the window is drawn, avoiding focus-stealing.

#### 3. Stealth Execution (Focus Management)
A massive part of stealth is ensuring that opening the overlay **doesn't steal focus** from the user's active window (like a browser or an IDE).
- `win.showInactive()`: Tells the OS to paint the window on the screen, but explicitly refuses to take keyboard or mouse focus away from the current application.
- `app.setActivationPolicy('accessory')` & `'prohibited'` (macOS): Tells macOS "this is a background service." It hides the app from the Dock, prevents it from appearing in the `Cmd + Tab` switcher, and stops it from ever being the "active" application.
- `win.setHiddenInMissionControl(true)` (macOS): Ensures that if the user swipes up to see all their open windows (Exposé/Mission Control), the overlay vanishes.

#### 4. How it Takes Screenshots (Self-Exclusion)
When you press the capture shortcut (`⌘H`), the app uses:
`desktopCapturer.getSources({ types: ['screen'] })`
This Electron API hooks into the native OS screen capture. Because the app's window has `setContentProtection(true)`, when it tells the OS to take a screenshot, **the OS captures the screen but naturally omits the overlay itself**. This allows the app to indefinitely "see" what is behind it without ever seeing itself.

### AI Processing Pipeline

1. **Capture**: The user presses the capture shortcut (`⌘H`), adding a full-screen screenshot to the local queue.
2. **Trigger**: The user triggers processing (`⌘↵`).
3. **Routing**:
   - If a **vision model** (like Gemma) is selected, base64 representations of the images are sent directly to Ollama.
   - If a **standard text model** is selected, the app spins up parallel web-workers using `tesseract.js` to run local OCR, extracting text from the images before sending the compiled text prompt to Ollama.
4. **Streaming**: Ollama streams the response back to Electron. Electron batches these IPC chunks and streams them into the React `SolutionPanel` for live, real-time Markdown rendering.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘B` | Show / hide overlay |
| `⌘H` | Capture screenshot |
| `⌘↵` | Process with AI |
| `⌘G` | Clear queue |
| `⌘;` | Toggle settings |
| `⌘Q` | Quit Application |
| `⌘← ↑ ↓ →` | Move overlay |

## ⚠️ Platform Notes

### macOS + Zoom
Zoom uses display-level capture by default which bypasses `NSWindowSharingNone`.
**Fix:** Zoom → Settings → Share Screen → enable **"Advanced Capture with window filtering"**, then share a specific application window (not Desktop).

### Windows
No extra steps needed. `WDA_EXCLUDEFROMCAPTURE` is enforced at the DWM compositor level — Zoom and all other capture apps cannot bypass it.
