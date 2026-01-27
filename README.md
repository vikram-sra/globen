# GlobeN 🌍

**GlobeN** (Global News) is a futuristic, 3D news visualization tool. It maps live RSS feeds from major nations onto an interactive, scientifically accurate Earth simulation.

## Key Features

-   **Cinematic Camera Navigation**: Implements advanced spherical interpolation (SLERP-like) for smooth, orbiting transitions between countries. The camera automatically calculates the shortest longitudinal path and uses custom cubic easing for a premium, anti-shake feel.
-   **Live News HUD**: Real-time RSS integration for 15+ countries (US, UK, China, India, Japan, etc.) displayed in a futuristic overlay.
-   **Scientific Earth Simulation**:
    -   **Dynamic Lighting**: Real-time sun position calculated based on UTC time, axial tilt, and day-of-year.
    -   **Custom Shaders**: Custom WebGL shaders for atmospheric scattering (sunset glow), fresnel halos, and specular ocean reflections.
    -   **Cloud Layer**: Parallel-processing cloud layer with independent orbital rotation.
-   **Clean Architecture**: Modularized CSS for better maintainability, with inlined JS logic to ensure maximum portability and local `file://` protocol compatibility.

## Usage

Simply open `index.html` in any modern web browser. No local server or build step required.

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
