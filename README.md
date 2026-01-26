# GlobeN 🌍

**GlobeN** (Global News) is a futuristic, 3D news visualization tool. It maps live RSS feeds from major nations onto an interactive, scientifically accurate Earth simulation.

## Features

-   **Live News Feeds**: Real-time RSS integration for 15+ countries (US, UK, China, Russia, Japan, etc.).
-   **Cinematic Physics**: Custom-tuned orbital controls with momentum damping and smooth "Fly-To" camera transitions.
-   **Mobile First**: Touch-optimized interaction, expansive hitboxes, and `touch-action` locking for native feeling gesture control.
-   **Scientific Rendering**:
    -   Real-time sun position based on UTC time and day-of-year (seasonal tilt).
    -   Atmospheric scattering shaders (sunset glow, fresnel atmosphere).
    -   Specular ocean mapping.
-   **Instant Start**: Zero-latency initial render with background asset streaming.

## Usage

Simply open `index.html` in any modern web browser. No build step required.

-   **Rotate**: Drag (Mouse/Touch).
-   **Select**: Click/Tap a country marker or use the **Dock** on the left.
-   **Read**: The HUD panel opens with live headlines. Click a headline to read the full source.

## Tech Stack

-   **Three.js**: WebGL rendering.
-   **TopoJSON**: Efficient country border data.
-   **Vanilla JS**: No frameworks, single-file architecture for portability.

## License

MIT
