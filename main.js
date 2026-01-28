import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
const GLOBE_RADIUS = 5;
const BORDER_RADIUS = 5.01;
const CLOUD_RADIUS = 5.05;
const MARKER_RADIUS = 5.1;
const CAMERA_DISTANCE = 15;

const TEXTURES = {
    day: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    clouds: 'https://unpkg.com/three-globe/example/img/earth-clouds.png',
    specular: 'https://unpkg.com/three-globe/example/img/earth-topology.png'
};

const BORDERS_URL = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

// --- Shaders ---
const globeVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vViewDir;
    void main() {
        vUv = uv;
        vNormal = normalize( (modelMatrix * vec4(normal, 0.0)).xyz );
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vViewDir = normalize(cameraPosition - vPosition);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const globeFragmentShader = `
    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform sampler2D uSpecularTexture;
    uniform vec3 uSunDirection;
    uniform bool uHasDay;
    uniform bool uHasNight;
    uniform bool uHasSpecular;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vViewDir;
    void main() {
        float dotSun = dot(vNormal, uSunDirection);
        float dayWeight = smoothstep(-0.15, 0.15, dotSun);
        vec3 dayColor = uHasDay ? texture2D(uDayTexture, vUv).rgb : vec3(0.1, 0.3, 0.6);
        vec3 nightColor = uHasNight ? texture2D(uNightTexture, vUv).rgb : vec3(0.01, 0.01, 0.02);
        vec3 moonlitNight = mix(nightColor, vec3(0.02, 0.02, 0.05), 0.3);
        float specularStrength = 0.0;
        if (uHasSpecular) {
            vec3 reflection = reflect(-uSunDirection, vNormal);
            float spec = pow(max(dot(vViewDir, reflection), 0.0), 32.0);
            specularStrength = texture2D(uSpecularTexture, vUv).r * spec * dayWeight;
        }
        vec3 baseColor = mix(moonlitNight, dayColor * 1.2, dayWeight);
        baseColor += specularStrength * vec3(0.8, 0.9, 1.0);
        float sunsetFactor = clamp(1.0 - abs(dotSun * 10.0), 0.0, 1.0);
        vec3 sunsetGlow = vec3(1.0, 0.4, 0.1) * sunsetFactor * 0.6;
        baseColor += sunsetGlow;
        float fresnel = pow(1.0 - dot(vViewDir, vNormal), 3.5);
        vec3 atmosphereColor = vec3(0.1, 0.3, 0.8) * fresnel * 0.4;
        gl_FragColor = vec4(baseColor + atmosphereColor, 1.0);
    }
`;

const cloudVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const cloudFragmentShader = `
    uniform sampler2D uCloudTexture;
    uniform float uCloudDensity;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;

    // Simplified procedural noise for storm patterns
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }

    void main() {
        // Simplified procedural noise for storm patterns
        float n = noise(vUv * 15.0 + uTime * 0.04);
        n += noise(vUv * 30.0 - uTime * 0.08) * 0.5;
        
        vec4 cloudTex = texture2D(uCloudTexture, vUv);
        
        // Form organic storm patterns
        float stormValue = mix(cloudTex.r, n, 0.45);
        
        // GUARANTEED VISIBILITY: Smooth threshold based on density
        // Even at 0% density, we keep a subtle haze
        float threshold = 0.85 - (uCloudDensity * 0.5);
        float alpha = smoothstep(threshold, threshold + 0.15, stormValue);
        
        // Swirl intensity and contrast
        vec3 finalColor = vec3(1.0, 1.0, 1.1) * (0.9 + n * 0.1);
        gl_FragColor = vec4(finalColor, alpha * 0.82);
    }
`;

// --- Data ---
const COUNTRIES = [
    { id: "Argentina", capital: "Buenos Aires", code: "ARG", lat: -34.6037, lon: -58.3816 },
    { id: "Australia", capital: "Canberra", code: "AUS", lat: -35.2809, lon: 149.1300 },
    { id: "Brazil", capital: "Brasília", code: "BRA", lat: -15.8267, lon: -47.9218 },
    { id: "Canada", capital: "Ottawa", code: "CAN", lat: 45.4215, lon: -75.6972 },
    { id: "China", capital: "Beijing", code: "CHN", lat: 39.9042, lon: 116.4074 },
    { id: "Egypt", capital: "Cairo", code: "EGY", lat: 30.0444, lon: 31.2357 },
    { id: "France", capital: "Paris", code: "FRA", lat: 48.8566, lon: 2.3522 },
    { id: "Germany", capital: "Berlin", code: "DEU", lat: 52.5200, lon: 13.4050 },
    { id: "India", capital: "New Delhi", code: "IND", lat: 28.6139, lon: 77.2090 },
    { id: "Indonesia", capital: "Jakarta", code: "IDN", lat: -6.2088, lon: 106.8456 },
    { id: "Italy", capital: "Rome", code: "ITA", lat: 41.9028, lon: 12.4964 },
    { id: "Japan", capital: "Tokyo", code: "JPN", lat: 35.6762, lon: 139.6503 },
    { id: "Mexico", capital: "Mexico City", code: "MEX", lat: 19.4326, lon: -99.1332 },
    { id: "Nigeria", capital: "Abuja", code: "NGA", lat: 9.0765, lon: 7.3986 },
    { id: "Russia", capital: "Moscow", code: "RUS", lat: 55.7558, lon: 37.6173 },
    { id: "Saudi Arabia", capital: "Riyadh", code: "SAU", lat: 24.7136, lon: 46.6753 },
    { id: "South Africa", capital: "Pretoria", code: "ZAF", lat: -25.7479, lon: 28.2293 },
    { id: "South Korea", capital: "Seoul", code: "KOR", lat: 37.5665, lon: 126.9780 },
    { id: "Spain", capital: "Madrid", code: "ESP", lat: 40.4168, lon: -3.7038 },
    { id: "Turkey", capital: "Ankara", code: "TUR", lat: 39.9334, lon: 32.8597 },
    { id: "United Kingdom", capital: "London", code: "GBR", lat: 51.5074, lon: -0.1278 },
    { id: "United States", capital: "Washington D.C.", code: "USA", lat: 38.9072, lon: -77.0369 }
].sort((a, b) => a.id.localeCompare(b.id));

const RSS_FEEDS = {
    "Argentina": 'https://www.mercopress.com/rss',
    "Australia": 'https://www.abc.net.au/news/feed/51120/rss.xml',
    "Brazil": 'https://www.brazilsvr.com/rss.xml',
    "Canada": 'https://www.cbc.ca/cmlink/rss-topstories',
    "China": 'http://www.chinadaily.com.cn/rss/china_rss.xml',
    "Egypt": 'https://dailynewsegypt.com/feed/',
    "France": 'https://www.france24.com/en/rss',
    "Germany": 'https://www.spiegel.de/international/index.rss',
    "India": 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    "Indonesia": 'https://www.thejakartapost.com/rss/latest',
    "Italy": 'https://www.ansa.it/sitoweb/export/ansareuters_en.xml',
    "Japan": 'https://www3.nhk.or.jp/rss/news/cat0.xml',
    "Mexico": 'https://mexiconewsdaily.com/feed/',
    "Nigeria": 'https://guardian.ng/feed/',
    "Russia": 'https://tass.com/rss',
    "Saudi Arabia": 'https://www.arabnews.com/cat/1/rss.xml',
    "South Africa": 'https://www.news24.com/news24/rss',
    "South Korea": 'http://www.koreaherald.com/common/rss_xml.php?ct=101',
    "Spain": 'https://elpais.com/rss/elpais/inenglish.xml',
    "Turkey": 'https://www.hurriyetdailynews.com/rss.aspx',
    "United Kingdom": 'http://feeds.bbci.co.uk/news/uk/rss.xml',
    "United States": 'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    "Global": 'http://feeds.bbci.co.uk/news/world/rss.xml'
};

// --- Helpers ---
function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

async function fetchWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,cloud_cover,wind_speed_10m,weather_code`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.current) throw new Error();
        return {
            temp: Math.round(data.current.temperature_2m),
            clouds: data.current.cloud_cover ?? 50,
            wind: Math.round(data.current.wind_speed_10m),
            code: data.current.weather_code
        };
    } catch (e) {
        return { temp: 22, clouds: 50, wind: 10, code: 0 };
    }
}

async function fetchNews(rssUrl) {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.status === 'ok') {
            return data.items.map(item => ({
                title: item.title,
                link: item.link,
                time: new Date(item.pubDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: data.feed.title.split(' ')[0],
                tag: 'LIVE'
            }));
        }
        throw new Error();
    } catch (e) {
        return [
            { title: 'Data Feed Synchronized', link: '#', time: 'NOW', source: 'SYS', tag: 'STAT' },
            { title: 'Global News Hub Online', link: '#', time: 'NOW', source: 'SYS', tag: 'STAT' }
        ];
    }
}

class GlobeApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.mouseDownPos = new THREE.Vector2();
        this.selectedCountry = null;
        this.selectedPosition = new THREE.Vector3();
        this.userPrefersRotation = false;
        this.targetCloudDensity = 0.5;
        this.currentCloudDensity = 0.5;
        this.targetWindSpeed = 10;
        this.currentWindSpeed = 10;
        this.shaderTime = 0;

        this.isFlying = false;
        this.flyStartTime = performance.now();
        this.flyDuration = 1200; // Accelerated for a snappier feel
        this.startSpherical = new THREE.Spherical();
        this.targetSpherical = new THREE.Spherical();
        this.currentSpherical = new THREE.Spherical();

        this.startQuaternion = new THREE.Quaternion();
        this.targetQuaternion = new THREE.Quaternion();

        this.initScene();
        this.initGlobe();
        this.initMarkers();

        this.loadResources().then(() => {
            this.updateGlobeMaterials();
            this.initBorders();
            this.initClouds();
        });

        this.initControls();
        this.initCountryDock();
        this.initRotationToggle();
        this.animate();
        this.hideLoader();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.z = 15;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        this.sunDirection = new THREE.Vector3();
    }



    async loadResources() {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        const load = (url) => new Promise(r => loader.load(url, r, undefined, () => r(null)));
        this.assets = {
            day: await load(TEXTURES.day),
            night: await load(TEXTURES.night),
            clouds: await load(TEXTURES.clouds),
            specular: await load(TEXTURES.specular),
            topo: await fetch(BORDERS_URL).then(r => r.json()).catch(() => null)
        };
    }

    initGlobe() {
        this.globeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uDayTexture: { value: new THREE.Texture() },
                uNightTexture: { value: new THREE.Texture() },
                uSpecularTexture: { value: new THREE.Texture() },
                uSunDirection: { value: this.sunDirection },
                uHasDay: { value: false }, uHasNight: { value: false }, uHasSpecular: { value: false }
            },
            vertexShader: globeVertexShader, fragmentShader: globeFragmentShader
        });
        this.globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128), this.globeMaterial);
        this.globe.rotation.y = -Math.PI / 2;
        this.scene.add(this.globe);
    }

    updateGlobeMaterials() {
        if (!this.assets) return;
        this.globeMaterial.uniforms.uDayTexture.value = this.assets.day || new THREE.Texture();
        this.globeMaterial.uniforms.uNightTexture.value = this.assets.night || new THREE.Texture();
        this.globeMaterial.uniforms.uSpecularTexture.value = this.assets.specular || new THREE.Texture();
        ['uHasDay', 'uHasNight', 'uHasSpecular'].forEach(k => this.globeMaterial.uniforms[k].value = !!this.assets[k.replace('uHas', '').toLowerCase()]);
    }

    initBorders() {
        if (!this.assets?.topo) return;
        try {
            const countries = topojson.feature(this.assets.topo, this.assets.topo.objects.countries);
            const vertices = [];
            countries.features.forEach(f => {
                const coords = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
                coords.forEach(poly => poly.forEach(ring => {
                    for (let i = 0; i < ring.length - 1; i++) {
                        const p1 = latLongToVector3(ring[i][1], ring[i][0], BORDER_RADIUS);
                        const p2 = latLongToVector3(ring[i + 1][1], ring[i + 1][0], BORDER_RADIUS);
                        vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                    }
                }));
            });
            const geom = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            this.borderLayer = new THREE.LineSegments(geom, new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.2 }));
            this.borderLayer.rotation.y = -Math.PI / 2;
            this.scene.add(this.borderLayer);
        } catch (e) { }
    }

    initClouds() {
        if (!this.assets?.clouds) return;
        this.cloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uCloudTexture: { value: this.assets.clouds },
                uCloudDensity: { value: 0.5 },
                uTime: { value: 0.0 }
            },
            vertexShader: cloudVertexShader, fragmentShader: cloudFragmentShader,
            transparent: true, blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(CLOUD_RADIUS, 128, 128), this.cloudMaterial);
        this.cloudMesh.rotation.y = -Math.PI / 2;
        this.scene.add(this.cloudMesh);
    }

    initMarkers() {
        // Minimalist but visible dots
        const geom = new THREE.CircleGeometry(0.1, 16);
        const visualMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff, side: THREE.DoubleSide });
        // Invisible but raycastable
        const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });

        this.markerVisuals = new THREE.InstancedMesh(geom, visualMat, COUNTRIES.length);
        this.markerHitbox = new THREE.InstancedMesh(geom, hitMat, COUNTRIES.length);

        this.markerVisuals.rotation.y = -Math.PI / 2;
        this.markerHitbox.rotation.y = -Math.PI / 2;

        const dummy = new THREE.Object3D();
        COUNTRIES.forEach((c, i) => {
            // Position
            const pos = latLongToVector3(c.lat, c.lon, MARKER_RADIUS);

            // Instanced Mesh Matrix
            dummy.position.copy(pos);
            dummy.lookAt(0, 0, 0);
            dummy.updateMatrix();
            this.markerVisuals.setMatrixAt(i, dummy.matrix);
            this.markerHitbox.setMatrixAt(i, dummy.matrix);
        });

        this.scene.add(this.markerVisuals, this.markerHitbox);
    }



    initRotationToggle() {
        const btn = document.getElementById('rotate-toggle');
        if (!btn) return;

        // Sync button text to state
        btn.textContent = `Auto-Rotate: OFF`;
        btn.classList.remove('active');

        btn.addEventListener('click', () => {
            this.userPrefersRotation = !this.userPrefersRotation;
            this.controls.autoRotate = this.userPrefersRotation;
            btn.classList.toggle('active', this.userPrefersRotation);
            btn.textContent = `Auto-Rotate: ${this.userPrefersRotation ? 'ON' : 'OFF'}`;
        });
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.6; this.controls.enablePan = false;
        this.controls.autoRotate = false; this.controls.autoRotateSpeed = 0.5;

        const startPos = latLongToVector3(40, -100, CAMERA_DISTANCE);
        startPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        this.camera.position.copy(startPos);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary) return;
            this.mouseDownPos.set(e.clientX, e.clientY);
            this.mouseDownTime = performance.now();
            this.controls.autoRotate = false; this.isFlying = false;
        });
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
        document.getElementById('close-panel').addEventListener('click', () => {
            document.getElementById('news-panel').classList.remove('active');
            this.controls.enableDamping = true;
            this.controls.autoRotate = this.userPrefersRotation;
        });
        this.clock = new THREE.Clock();
    }

    initCountryDock() {
        const dock = document.getElementById('country-dock');
        if (!dock) return;

        // Add Home Node
        const homeNode = document.createElement('div');
        homeNode.className = 'country-btn home-btn';
        homeNode.innerHTML = `<span>⌂</span><span class="label">HOME BASE</span>`;
        homeNode.addEventListener('click', (e) => {
            e.stopPropagation();
            this.flyToCountry({ lat: 40, lon: -100, id: "Home" });
        });
        dock.appendChild(homeNode);

        COUNTRIES.forEach(country => {
            const btn = document.createElement('div');
            btn.className = 'country-btn';
            btn.innerHTML = `<span>${country.code}</span><span class="label">${country.id}</span>`;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.flyToCountry(country);
            });
            dock.appendChild(btn);
        });
    }

    flyToCountry(country) {
        this.selectedCountry = country;
        this.controls.autoRotate = false;

        // Store starting state
        this.startSpherical.setFromVector3(this.camera.position);
        this.startQuaternion.copy(this.camera.quaternion);

        // Calculate target position
        const targetVec = latLongToVector3(country.lat, country.lon, CAMERA_DISTANCE);
        targetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

        this.targetSpherical.setFromVector3(targetVec);
        this.targetQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetVec.clone().negate().normalize());

        // Longitude shortest path
        let dTheta = this.targetSpherical.theta - this.startSpherical.theta;
        while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
        this.targetSpherical.theta = this.startSpherical.theta + dTheta;

        this.isFlying = true;
        this.flyStartTime = performance.now();
        if (country.id !== "Home") this.showNews(country);
    }



    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onPointerUp(event) {
        if (!event.isPrimary) return;
        const dist = this.mouseDownPos.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
        const duration = performance.now() - (this.mouseDownTime || 0);
        if (dist > 10 || duration > 500) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.markerHitbox);

        if (intersects.length > 0) {
            this.flyToCountry(COUNTRIES[intersects[0].instanceId]);
        } else if (!event.target.closest('#ui-overlay')) {
            document.getElementById('news-panel').classList.remove('active');
            this.controls.enableDamping = true;
            this.controls.autoRotate = this.userPrefersRotation;
            this.selectedCountry = null;
        }
    }

    async showNews(country) {
        this.selectedCountry = country;
        this.selectedPosition.copy(latLongToVector3(country.lat, country.lon, MARKER_RADIUS));
        const panel = document.getElementById('news-panel');
        const content = document.getElementById('news-content');
        this.controls.enableDamping = false; this.controls.autoRotate = false;
        panel.classList.add('active');
        content.innerHTML = `<h2>${country.id} Intelligence</h2><p>Scanning atmospheric data...</p>`;

        const [news, weather] = await Promise.all([fetchNews(RSS_FEEDS[country.id] || RSS_FEEDS['Global']), fetchWeather(country.lat, country.lon)]);

        this.targetCloudDensity = weather.clouds / 100;
        this.targetWindSpeed = weather.wind;
        content.innerHTML = `<h2>${country.capital}, ${country.id}</h2><div id='news-list'></div>`;
        const list = document.getElementById('news-list');
        news.forEach((item, i) => {
            const el = document.createElement('a'); el.className = 'news-item';
            el.href = item.link; el.target = '_blank'; el.rel = 'noopener';
            el.innerHTML = `
                <div class='meta'>
                    <span class='tag'>[${item.tag}]</span> ${item.source} • ${item.time}
                    ${i === 0 ? `<span class="weather-tag">${weather.temp}°C | CLOUDS ${weather.clouds}% | WIND ${weather.wind}km/h</span>` : ''}
                </div>
                <div class='title'>${item.title}</div>`;
            list.appendChild(el);
            setTimeout(() => el.classList.add('visible'), 50 + i * 50);
        });
    }

    hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 1000); }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const now = new Date();
        const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
        const startDay = new Date(now.getUTCFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - startDay) / (1000 * 60 * 60 * 24));
        const shaderTime = Date.now() * 0.0005;

        const sunLon = -((utcHours - 12.0) / 24.0) * (Math.PI * 2.0);
        const declination = 23.44 * (Math.PI / 180) * Math.sin((dayOfYear - 81) * (2.0 * Math.PI / 365.25));
        this.sunDirection.set(Math.cos(declination) * Math.sin(sunLon), Math.sin(declination), Math.cos(declination) * Math.cos(sunLon)).normalize();

        if (this.globeMaterial) this.globeMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);
        if (this.cloudMesh) this.cloudMesh.rotation.y += delta * 0.05 + 0.00005;

        // Smooth Cloud & Wind Transition
        this.currentCloudDensity = THREE.MathUtils.lerp(this.currentCloudDensity, this.targetCloudDensity, 0.05);
        this.currentWindSpeed = THREE.MathUtils.lerp(this.currentWindSpeed, this.targetWindSpeed, 0.02);

        if (this.cloudMaterial) {
            this.cloudMaterial.uniforms.uCloudDensity.value = this.currentCloudDensity;
            // Drive cloud swirl speed with local wind speed
            this.shaderTime += delta * (0.2 + this.currentWindSpeed * 0.05);
            this.cloudMaterial.uniforms.uTime.value = this.shaderTime;
        }

        this.controls.update();
        if (this.isFlying) {
            const elapsed = performance.now() - this.flyStartTime;
            const t = Math.min(elapsed / this.flyDuration, 1);

            // Quintic Out Easing for snap-to-finish smoothness
            const easedT = 1 - Math.pow(1 - t, 4);

            // Interpolate Position
            this.currentSpherical.phi = THREE.MathUtils.lerp(this.startSpherical.phi, this.targetSpherical.phi, easedT);
            this.currentSpherical.theta = THREE.MathUtils.lerp(this.startSpherical.theta, this.targetSpherical.theta, easedT);
            this.currentSpherical.radius = THREE.MathUtils.lerp(this.startSpherical.radius, this.targetSpherical.radius, easedT);
            this.camera.position.setFromSpherical(this.currentSpherical);

            // Stabilize look-at during flight
            this.camera.lookAt(0, 0, 0);

            if (t >= 1) {
                this.isFlying = false;
                this.controls.target.set(0, 0, 0);
            }
        }

        // UI Updates
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) timeDisplay.textContent = now.toUTCString();

        this.drawTether();
        this.renderer.render(this.scene, this.camera);
    }

    drawTether() {
        const panel = document.getElementById('news-panel');
        const tether = document.getElementById('tether-path');
        if (this.selectedCountry && panel.classList.contains('active')) {
            const pos = this.selectedPosition.clone();
            pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
            const cameraToPoint = pos.clone().sub(this.camera.position).normalize();
            const dot = pos.clone().normalize().dot(cameraToPoint);

            if (dot < 0) {
                panel.style.display = 'block';
                pos.project(this.camera);
                const mx = (pos.x * 0.5 + 0.5) * window.innerWidth;
                const my = (-(pos.y * 0.5) + 0.5) * window.innerHeight;
                panel.style.transform = `translate(${mx + 30}px, ${my - 50}px)`;

                // SVG Bezier Curve
                const panelRect = panel.getBoundingClientRect();
                const x1 = panelRect.left;
                const y1 = panelRect.top + 20;
                const x2 = mx;
                const y2 = my;
                // Control point for curve
                const cx = (x1 + x2) / 2 - 50;
                const cy = (y1 + y2) / 2;
                tether.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
                tether.style.display = 'block';
            } else { panel.style.display = 'none'; tether.style.display = 'none'; }
        } else { panel.style.display = 'none'; tether.style.display = 'none'; }
    }
}

new GlobeApp();

(function () {
    let lastEtag = null;
    async function checkForUpdate() {
        try {
            const url = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 't=' + Date.now();
            const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
            const etag = res.headers.get('etag');
            if (etag && lastEtag && lastEtag !== etag) window.location.reload();
            lastEtag = etag;
        } catch (e) { }
    }
    setInterval(checkForUpdate, 30000);
    checkForUpdate();
})();
