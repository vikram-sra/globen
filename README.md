# Earth News Globe

A real-time, interactive 3D Earth visualization that aggregates live news feeds from around the world. Built with Three.js and modern Web APIs.

![Globe Preview](https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg) *Note: Representative image*

## Features

*   **Interactive 3D Globe**: Fully navigable earth with orbit controls (zoom, pan, rotate).
*   **Real-Time Day/Night Cycle**: Accurate lighting shading based on the current time and date, simulating the sun's position.
*   **Live News Feeds**: Click on country markers to view the latest headlines from major international sources (BBC, CBC, etc.).
*   **Atmospheric Effects**:
    *   Dynamic clouds layer with rotation.
    *   Sunset glow and atmospheric scattering (Rayleigh-like simulation).
    *   Specular reflections on oceans.
    *   Night city lights on the dark side of the globe.
*   **Robust & Minimalist**: Single-file architecture for easy deployment and zero build steps.

## Technologies

*   **HTML5 / CSS3**: Custom UI with glassmorphism effects.
*   **Three.js**: Core 3D rendering engine.
*   **TopoJSON**: For rendering optimized country borders.
*   **RSS2JSON**: API for fetching and parsing RSS feeds.

## Getting Started

### Prerequisites

*   A modern web browser (Chrome, Firefox, Safari, Edge).
*   An internet connection (to load textures and news feeds).

### Running Locally

Since this project uses ES6 Modules (`type="module"`), you cannot simply double-click `index.html` due to CORS policies. You must serve it via a local web server.

**Option 1: Python (Recommended)**
1.  Open your terminal in the project folder.
2.  Run:
    ```bash
    # Python 3
    python3 -m http.server 8000
    ```
3.  Open `http://localhost:8000` in your browser.

**Option 2: Node.js (npx)**
1.  Run:
    ```bash
    npx serve .
    ```

**Option 3: VS Code**
1.  Install the "Live Server" extension.
2.  Right-click `index.html` and select "Open with Live Server".

## License

This project is open-source. Feel free to fork and modify!
