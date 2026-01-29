# 🌍 Globen Technical Roadmap (Code-Aware Upgrade)

**Context:** Vanilla Three.js (ES Modules), Custom Shaders, InstancedMesh Markers.
**Target:** Radio.Garden fidelity, Multi-source News, High-res Zoom.

---

## Part 1: Technical Implementation Strategy

### A. Data Layer (The "Brain")

#### 1. Dynamic Country Generation (Fixing the Hardcoded List)
* **Current State:** You are manually defining `COUNTRIES` array (22 items).
* **Strategy:** You are already loading `countries-110m.json` (TopoJSON). We can parse this file to auto-generate the country list.
* **Logic:**
    * Iterate through `topojson.feature(this.assets.topo, ...).features`.
    * Calculate the **Centroid** of each polygon (math average of coordinates) to get the `lat/lon` automatically.
    * Map the `id` (ISO code) to names using `Intl.DisplayNames` (native JS API) so you don't need a huge mapping list.

#### 2. Multi-Source News Aggregation
* **Current State:** `RSS_FEEDS` maps 1 country to 1 URL.
* **Strategy:** Update the structure to support arrays.
    * *Change:* `RSS_FEEDS = { "USA": ["bbc_url", "cnn_url", "aljazeera_url"], ... }`
    * *Logic:* In `showNews`, iterate through the array. Use `Promise.allSettled` to fetch multiple feeds simultaneously.
    * *Deduplication:* Merge the resulting lists and sort by time.

### B. Visual Layer (The "Beauty")

#### 1. "Radio Garden" Tile Engine (Replacing the Shader Sphere)
* **The Conflict:** Your `globeFragmentShader` creates the beautiful atmosphere/sunset effects. Standard "Tile Engines" usually overwrite this with flat image tiles.
* **The Solution:** Use **`three-globe`** (via CDN).
    * It supports `globeTileEngineUrl` (for the zoom clarity).
    * It preserves performance.
    * *Trade-off:* You will likely lose the custom "Sunset Glow" shader logic on the *surface* specifically, but you can keep the `cloudMesh` and atmosphere halo on top to retain the aesthetic.

#### 2. Marker Upgrade (InstancedMesh -> Sprites)
* **Current State:** `InstancedMesh` of `CircleGeometry`. This is performant but flat (2D circles on 3D sphere).
* **Strategy:** Switch to `THREE.Sprite`.
    * Sprites always face the camera (Billboard).
    * **Visual:** Use a `CanvasTexture` to draw a "soft glow" gradient programmatically (no external image needed).
    * **Animation:** Sprites are easier to animate individually (pulsing) than updating a `Matrix4` attribute in an `InstancedMesh`.

#### 3. Flags
* **Implementation:** Inside `showNews(country)`, inject `<img src="https://flagcdn.com/w80/${country.code.toLowerCase()}.png">` into the DOM.

---

## Part 2: The AI Agent Prompt

*Copy the block below into your AI editor. It is specifically tailored to your file structure (`GlobeApp` class).*

```text
@Context: 
- Project: "Globen" (Vanilla Three.js via ES Modules).
- Files: main.js, style.css, index.html.
- Class: `GlobeApp` handles the scene.

I need to perform a "Phase 2" upgrade focusing on Data Density and Visual Fidelity.
Please implement the following changes step-by-step.

### STEP 1: UPGRADE COUNTRY DATA (Dynamic Generation)
- Currently, `COUNTRIES` is a hardcoded array.
- In `initBorders()` or a new method, iterate through the `topojson` features from `this.assets.topo`.
- For every country in the TopoJSON:
  1. Calculate its centroid (lat/lon) from the geometry coordinates.
  2. Use `Intl.DisplayNames` to get the full English name from the ISO code.
  3. Push valid countries to `this.countries` list dynamically.
- Update `initCountryDock` to render this new, larger list (add a search filter input to the dock if list > 20).

### STEP 2: MULTI-SOURCE NEWS & FLAGS
- In `main.js`, update `RSS_FEEDS` to accept an *array* of URLs per country. Add 2-3 generic global feeds (like BBC World, Reuters) as fallbacks for every country.
- Update `fetchNews()` to accept an array of URLs. Use `Promise.allSettled` to fetch them in parallel, merge the items, deduplicate by title, and sort by date.
- In `showNews(country)`:
  1. Inject the country's flag using `https://flagcdn.com/w80/{country.code.toLowerCase()}.png` next to the country name.
  2. Display the merged news list.

### STEP 3: VISUALS - TILES & MARKERS
- **Tiles:** We need high-res zoom. Import `ThreeGlobe` from `https://esm.sh/three-globe`.
  - Replace `this.globe` (the simple SphereGeometry) with a `new ThreeGlobe()`.
  - Configure it with `.globeTileEngineUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')`.
  - *Note:* Keep the existing `cloudMesh` and `borderLayer` on top of this new globe.
- **Markers:** Replace `initMarkers` (InstancedMesh) with `THREE.Sprite`.
  - Create a function `createGlowTexture()` that returns a canvas gradient (transparent -> cyan -> white center).
  - For each country, create a Sprite using this texture.
  - In `animate()`, add a pulsing scale effect (using `Math.sin(Date.now())`) to the sprites.

### STEP 4: UI TWEAKS
- Update `style.css` to handle the flag image in the `#news-panel h2` (make it flex row).
- Ensure the "Blue Dot" sprites are clickable via the existing Raycaster logic.