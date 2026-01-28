# GlobeN 🌍

**GlobeN** (Global News) is a futuristic, 3D news visualization tool. It maps live RSS feeds from major nations onto an interactive, scientifically accurate Earth simulation.

## Key Features

-   **Cinematic Camera Navigation**: Implements advanced spherical interpolation for smooth, orbiting transitions between capitals. The camera automatically calculates the shortest longitudinal path and uses custom easing for a premium feel.
-   **Capital City Mapping**: Strategic markers are positioned at precise capital city coordinates (e.g., Washington D.C., London, Tokyo) for accurate geographical context.
-   **Live News HUD**: Real-time RSS integration and local weather data (temperature, wind speed, cloud cover) displayed in a futuristic overlay.
-   **Performance Optimized**: 
    -   Removed heavy starfield point clouds to reduce draw calls.
    -   Minimalist visual footprint with hidden celestial bodies to focus on Earth data.
    -   **Auto-Rotate Toggle**: User-controlled rotation to save CPU/GPU overhead.
-   **Scientific Earth Simulation**:
    -   **Dynamic Lighting**: Real-time sun position calculated based on UTC time, axial tilt, and day-of-year.
    -   **Custom Shaders**: Custom WebGL shaders for atmospheric sunset glow, fresnel halos, and specular reflections.
    -   **Cloud Layer**: Dynamic cloud swirl driven by real-time local wind speed data.
-   **Clean Architecture**: Modularized CSS and JS logic (`main.js`) for better maintainability and concern separation.

## Usage

Simply open `index.html` in any modern web browser or serve it locally.

-   **Rotate**: Drag (Mouse/Touch).
-   **Select**: Click/Tap a country marker or use the **Country Dock** on the left.
-   **Interact**: Click headlines in the HUD panel to open the full news source.

## Tech Stack

-   **Three.js**: WebGL rendering engine.
-   **OrbitControls**: Enhanced for seamless transition blending.
-   **TopoJSON**: Efficient country border vector data.
-   **Vanilla JS/CSS**: High-performance, zero-dependency implementation.

## License

MIT
