# GlobeN 🌍

**GlobeN** (Global News) is a futuristic, cinematic 3D news visualization platform. It maps real-time global intelligence and atmospheric data onto a high-fidelity, scientifically accurate Earth simulation.

## 🚀 Key Features

-   **Cinematic Camera Navigation**: Advanced spherical interpolation (Slerp) and custom quad-easing for smooth, professional-grade transitions between nations.
-   **Expanded Global Intel**: Strategic markers and live feeds for over **40+ countries**, with accurate capital city mapping and high-definition national flags (FlagCDN integration).
-   **24-Hour Live News Engine**: 
    -   Real-time aggregation from 60+ high-authority global RSS sources.
    -   Intelligent filtering for a rolling **24-48 hour window** to ensure maximum relevancy.
    -   Deep data deduplication and chronological sorting for a clean, long-form news stream.
-   **Futuristic HUD (Heads-Up Display)**:
    -   **Dynamic Weather Sync**: Real-time temperature, cloud cover, and wind speed data (Open-Meteo API).
    -   **Interactive Tether**: A dynamic SVG bezier curve "tethers" the 3D globe selection directly to the news panel.
    -   **Compact Search**: Expandable search interface for rapid nation lookup.
-   **Scientific Earth Simulation**:
    -   **Dynamic Solar Tracking**: Real-time sun position calculated via axial tilt and UTC time.
    -   **Advanced WebGL Shaders**: Custom atmospheric scattering (Sunset/Day split), Fresnel halos, and specular night-light mapping.
    -   **Reactive Clouds**: Cloud rotation speed and density are driven by local wind data from the selected region.
-   **Performance-First Design**: 
    -   Optimized draw calls with sprite-based markers and minimalist vector borders (TopoJSON).
    -   Compact, minimalist sidebar with isolated scrolling to prevent 3D gimbal lock.

## 🛠 Usage

1. Start the local development server:
   ```bash
   python3 -m http.server 8000
   ```
2. Navigate to `http://localhost:8000`.

### Controls
-   **Explore**: Drag to rotate, Scroll to zoom.
-   **Select**: Click/Tap a marker or use the **Compact Dock** (Left Sidebar).
-   **Search**: Hover the top-left search icon to expand and filter nations.

## 🧬 Tech Stack

-   **Three.js**: Core WebGL rendering logic.
-   **OrbitControls**: Customized for seamless transition blending.
-   **TopoJSON**: High-efficiency geographical boundary data.
-   **Vanilla JS/CSS**: Zero-dependency, high-performance implementation.

## 📄 License
MIT
