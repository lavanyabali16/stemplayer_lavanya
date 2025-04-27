# Web Audio Stem Player Demo

A simple web application demonstrating stem-based audio playback using the Web Audio API, inspired by the Stem Player device.

## Project Overview

This project allows users to select a predefined song and control the playback of its individual audio stems (vocals, drums, bass, instruments). Users can toggle stems on/off individually or play the full mix. All playback is synchronized using the Web Audio API.

**Note:** This project uses pre-extracted audio stems. No AI or real-time stem separation is involved.

## Features

-   **Song Selection:** Choose from a predefined list of songs.
-   **Dynamic Stem Loading:** Loads the four stems for the selected song.
-   **Isolated Playback:** Click individual stem buttons (Vocals, Drums, Bass, Instruments) to toggle them. Multiple stems can be layered.
-   **Combined Playback:** A "Full Mix" button plays all stems together.
-   **Synchronization:** Stems remain perfectly time-aligned using `AudioContext`.
-   **Visual Feedback:** Buttons change appearance to indicate active stems. Status and time display provide playback info.
-   **Fade Transitions:** Smooth (short) fade-in/out when toggling stems.
-   **Keyboard Shortcuts:** Control stems and full mix using keyboard keys (V, D, B, I, F).
-   **Responsive UI:** Adapts to different screen sizes.
-   **Error Handling:** Basic messages for loading errors.

## Technical Stack

-   **Frontend:** HTML5, CSS3 (Flexbox), Vanilla JavaScript
-   **Audio:** Web Audio API
-   **Assets:** Local `.mp3` audio stem files.

## File Structure

```
stem-player-web/
├── public/
│   └── audio/
│       ├── songA/
│       │   ├── vocals.mp3
│       │   ├── drums.mp3
│       │   ├── bass.mp3
│       │   └── instruments.mp3
│       └── songB/
│           ├── vocals.mp3
│           # ... other stems ...
│       # ... other song folders ...
├── index.html       # Main HTML file
├── style.css        # CSS styles
├── script.js        # JavaScript logic
└── README.md        # This file
```

## Setup and Usage

1.  **Clone or Download:** Get the project files onto your local machine.
2.  **Add Audio Stems:**
    *   Navigate to the `public/audio/` directory.
    *   Create folders for each song you want to include (e.g., `songA`, `songB`).
    *   Inside each song folder, place your four audio stem files. **Crucially, they must be named exactly:** `vocals.mp3`, `drums.mp3`, `bass.mp3`, `instruments.mp3`.
    *   Ensure the stems are properly time-aligned (start at the same point). `.mp3` is recommended for web compatibility, but other formats supported by `decodeAudioData` (like `.wav`, `.ogg`) might work.
3.  **Update Song List (Optional):**
    *   Open `script.js`.
    *   Find the `songs` object near the top.
    *   Add or modify entries in the format `'Display Name': 'folderName'`, where `folderName` matches the directory you created in `public/audio/`.
    ```javascript
    const songs = {
        'Your Song Title 1': 'songA', // Example
        'Another Cool Track': 'songB',
        'My New Song': 'myNewSongFolder' // Add this line if you added a folder named 'myNewSongFolder'
    };
    ```
4.  **Run Locally:**
    *   Because the application uses `fetch` to load local audio files, directly opening `index.html` in your browser (`file:///...`) will likely **fail** due to security restrictions (CORS policy).
    *   You need to serve the files using a simple local web server.
    *   **Using Python (if installed):**
        *   Open your terminal or command prompt.
        *   Navigate (`cd`) into the `stem-player-web` directory (the one containing `index.html`).
        *   Run: `python -m http.server` (for Python 3) or `python -m SimpleHTTPServer` (for Python 2).
        *   Open your web browser and go to `http://localhost:8000` (or the port shown in the terminal).
    *   **Using Node.js (if installed):**
        *   Install `http-server` globally (if you haven't already): `npm install -g http-server`
        *   Open your terminal or command prompt.
        *   Navigate (`cd`) into the `stem-player-web` directory.
        *   Run: `http-server`
        *   Open your web browser and go to `http://localhost:8080` (or the address shown).
    *   **Using VS Code Live Server:** If you use VS Code, install the "Live Server" extension, right-click `index.html`, and choose "Open with Live Server".
5.  **Interact:**
    *   Select a song from the dropdown. Wait for the "Loading..." indicator to disappear.
    *   Click the stem buttons (Vocals, Drums, Bass, Instruments) or the "Full Mix" button to control playback.
    *   Use keyboard keys `V`, `D`, `B`, `I`, `F` as shortcuts.

## Limitations

-   Requires pre-split stem files.
-   Basic error handling.
-   No pause/resume or seeking functionality implemented (playback always starts from the beginning).
-   Performance might vary depending on the size of the audio files and the browser/device.