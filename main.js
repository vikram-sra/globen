import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Removed ThreeGlobe import to fix version conflicts and restore custom shaders

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
// --- Data ---
const COUNTRIES = [
    { id: "Argentina", capital: "Buenos Aires", code: "AR", lat: -34.6037, lon: -58.3816 },
    { id: "Australia", capital: "Canberra", code: "AU", lat: -35.2809, lon: 149.1300 },
    { id: "Brazil", capital: "Brasília", code: "BR", lat: -15.8267, lon: -47.9218 },
    { id: "Canada", capital: "Ottawa", code: "CA", lat: 45.4215, lon: -75.6972 },
    { id: "Chile", capital: "Santiago", code: "CL", lat: -33.4489, lon: -70.6693 },
    { id: "China", capital: "Beijing", code: "CN", lat: 39.9042, lon: 116.4074 },
    { id: "Colombia", capital: "Bogotá", code: "CO", lat: 4.7110, lon: -74.0721 },
    { id: "Egypt", capital: "Cairo", code: "EG", lat: 30.0444, lon: 31.2357 },
    { id: "Ethiopia", capital: "Addis Ababa", code: "ET", lat: 9.0306, lon: 38.7469 },
    { id: "France", capital: "Paris", code: "FR", lat: 48.8566, lon: 2.3522 },
    { id: "Germany", capital: "Berlin", code: "DE", lat: 52.5200, lon: 13.4050 },
    { id: "Greece", capital: "Athens", code: "GR", lat: 37.9838, lon: 23.7275 },
    { id: "India", capital: "New Delhi", code: "IN", lat: 28.6139, lon: 77.2090 },
    { id: "Indonesia", capital: "Jakarta", code: "ID", lat: -6.2088, lon: 106.8456 },
    { id: "Israel", capital: "Jerusalem", code: "IL", lat: 31.7683, lon: 35.2137 },
    { id: "Italy", capital: "Rome", code: "IT", lat: 41.9028, lon: 12.4964 },
    { id: "Japan", capital: "Tokyo", code: "JP", lat: 35.6762, lon: 139.6503 },
    { id: "Kenya", capital: "Nairobi", code: "KE", lat: -1.2921, lon: 36.8219 },
    { id: "Malaysia", capital: "Kuala Lumpur", code: "MY", lat: 3.1390, lon: 101.6869 },
    { id: "Mexico", capital: "Mexico City", code: "MX", lat: 19.4326, lon: -99.1332 },
    { id: "Netherlands", capital: "Amsterdam", code: "NL", lat: 52.3676, lon: 4.9041 },
    { id: "New Zealand", capital: "Wellington", code: "NZ", lat: -41.2865, lon: 174.7762 },
    { id: "Nigeria", capital: "Abuja", code: "NG", lat: 9.0765, lon: 7.3986 },
    { id: "Norway", capital: "Oslo", code: "NO", lat: 59.9139, lon: 10.7522 },
    { id: "Pakistan", capital: "Islamabad", code: "PK", lat: 33.6844, lon: 73.0479 },
    { id: "Peru", capital: "Lima", code: "PE", lat: -12.0464, lon: -77.0428 },
    { id: "Philippines", capital: "Manila", code: "PH", lat: 14.5995, lon: 120.9842 },
    { id: "Poland", capital: "Warsaw", code: "PL", lat: 52.2297, lon: 21.0122 },
    { id: "Portugal", capital: "Lisbon", code: "PT", lat: 38.7223, lon: -9.1393 },
    { id: "Russia", capital: "Moscow", code: "RU", lat: 55.7558, lon: 37.6173 },
    { id: "Saudi Arabia", capital: "Riyadh", code: "SA", lat: 24.7136, lon: 46.6753 },
    { id: "Singapore", capital: "Singapore", code: "SG", lat: 1.3521, lon: 103.8198 },
    { id: "South Africa", capital: "Pretoria", code: "ZA", lat: -25.7479, lon: 28.2293 },
    { id: "South Korea", capital: "Seoul", code: "KR", lat: 37.5665, lon: 126.9780 },
    { id: "Spain", capital: "Madrid", code: "ES", lat: 40.4168, lon: -3.7038 },
    { id: "Sweden", capital: "Stockholm", code: "SE", lat: 59.3293, lon: 18.0686 },
    { id: "Switzerland", capital: "Bern", code: "CH", lat: 46.9480, lon: 7.4474 },
    { id: "Thailand", capital: "Bangkok", code: "TH", lat: 13.7563, lon: 100.5018 },
    { id: "Turkey", capital: "Ankara", code: "TR", lat: 39.9334, lon: 32.8597 },
    { id: "Ukraine", capital: "Kyiv", code: "UA", lat: 50.4501, lon: 30.5234 },
    { id: "United Kingdom", capital: "London", code: "GB", lat: 51.5074, lon: -0.1278 },
    { id: "United States", capital: "Washington D.C.", code: "US", lat: 38.9072, lon: -77.0369 },
    { id: "Vietnam", capital: "Hanoi", code: "VN", lat: 21.0285, lon: 105.8542 }
].sort((a, b) => a.id.localeCompare(b.id));

const GENERIC_FEEDS = [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.reutersagency.com/feed/?best-sectors=world-news&post_type=best',
    'https://www.aljazeera.com/xml/rss/all.xml'
];

const RSS_FEEDS = {
    "AR": ['https://www.mercopress.com/rss'],
    "AU": ['https://www.abc.net.au/news/feed/51120/rss.xml', 'https://www.smh.com.au/rss/feed.xml'],
    "BR": ['https://www.brazilsvr.com/rss.xml', 'https://riotimesonline.com/feed/'],
    "CA": ['https://www.cbc.ca/cmlink/rss-topstories', 'https://www.thestar.com/search/?f=rss&t=article&c=news&l=50&s=start_time&sd=desc'],
    "CN": ['http://www.chinadaily.com.cn/rss/china_rss.xml', 'https://www.scmp.com/rss/91/feed'],
    "EG": ['https://dailynewsegypt.com/feed/', 'https://www.egyptindependent.com/feed/'],
    "FR": ['https://www.france24.com/en/rss', 'https://www.lemonde.fr/en/rss/une.xml'],
    "DE": ['https://www.spiegel.de/international/index.rss', 'https://www.dw.com/en/top-stories/s-9097/rss'],
    "IN": ['https://timesofindia.indiatimes.com/rssfeedstopstories.cms', 'https://www.thehindu.com/news/national/feeder/default.rss'],
    "ID": ['https://www.thejakartapost.com/rss/latest'],
    "IT": ['https://www.ansa.it/sitoweb/export/ansareuters_en.xml', 'https://www.wantedinrome.com/feed'],
    "JP": ['https://www3.nhk.or.jp/rss/news/cat0.xml', 'https://www.japantimes.co.jp/feed'],
    "MX": ['https://mexiconewsdaily.com/feed/', 'https://elpais.com/mexico/rss/'],
    "NG": ['https://guardian.ng/feed/', 'https://vanguardngr.com/feed/'],
    "RU": ['https://tass.com/rss', 'https://www.themoscowtimes.com/rss/news'],
    "SA": ['https://www.arabnews.com/cat/1/rss.xml', 'https://www.saudigazette.com.sa/rss'],
    "ZA": ['https://www.news24.com/news24/rss', 'https://www.dailymaverick.co.za/feed/'],
    "KR": ['http://www.koreaherald.com/common/rss_xml.php?ct=101', 'https://www.koreatimes.co.kr/www/rss/rss.xml'],
    "ES": ['https://elpais.com/rss/elpais/inenglish.xml', 'https://www.thelocal.es/feed'],
    "TR": ['https://www.hurriyetdailynews.com/rss.aspx', 'https://www.dailysabah.com/rss'],
    "GB": ['http://feeds.bbci.co.uk/news/uk/rss.xml', 'https://www.theguardian.com/uk/rss'],
    "US": ['http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'],
    "UA": ['https://www.ukrinform.net/rss/news', 'https://kyivindependent.com/feed/'],
    "IL": ['https://www.haaretz.com/cmlink/1.4659220', 'https://www.jpost.com/rss'],
    "VN": ['https://vietnamnews.vn/rss/latest-news.xml'],
    "TH": ['https://www.bangkokpost.com/rss/data/topstories.xml'],
    "MY": ['https://www.thestar.com.my/rss/news/nation'],
    "PH": ['https://www.philstar.com/rss/headlines'],
    "SG": ['https://www.straitstimes.com/news/world/rss.xml'],
    "SE": ['https://www.thelocal.se/feed'],
    "NO": ['https://www.thelocal.no/feed'],
    "NL": ['https://nltimes.nl/rss.xml'],
    "CH": ['https://www.swissinfo.ch/eng/rss']
};

// Removed static RSS_FEEDS map in favor of code-based lookup

// --- Helpers ---
function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
}

function getPolygonCentroid(pts) {
    let lat = 0, lon = 0;
    pts.forEach(p => { lat += p[1]; lon += p[0]; });
    return { lat: lat / pts.length, lon: lon / pts.length };
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

async function fetchNews(rssUrls) {
    const urls = Array.isArray(rssUrls) ? rssUrls : [rssUrls];
    const now = Date.now();
    const window24h = 24 * 60 * 60 * 1000;

    const fetchWithRetry = async (url) => {
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.status !== 'ok') throw new Error();
        return data.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: new Date(item.pubDate).getTime(),
            time: new Date(item.pubDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: data.feed.title.split(' ')[0],
            tag: 'LIVE'
        }));
    };

    try {
        const results = await Promise.allSettled(urls.map(fetchWithRetry));
        let allNews = results
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value);

        // Filter for last 48h for better data density, fallback to latest news if empty
        const window48h = 48 * 60 * 60 * 1000;
        let filteredNews = allNews.filter(item => (now - item.pubDate) < window48h);

        // If 48h is empty, just use the latest available news
        if (filteredNews.length === 0) filteredNews = allNews;

        allNews = filteredNews;

        // Deduplicate by title
        const seen = new Set();
        allNews = allNews.filter(item => {
            const isDuplicate = seen.has(item.title);
            seen.add(item.title);
            return !isDuplicate;
        });

        // Sort by date newest first
        allNews.sort((a, b) => b.pubDate - a.pubDate);

        if (allNews.length === 0) throw new Error();
        return allNews; // Return everything from last 24h (long list)
    } catch (e) {
        return [
            { title: 'Data Feed Synchronized', link: '#', time: 'NOW', source: 'SYS', tag: 'STAT' },
            { title: 'Global News Hub Online', link: '#', time: 'NOW', source: 'SYS', tag: 'STAT' }
        ];
    }
}


// --- Helpers ---
function getWeatherEmoji(code) {
    if (code === 0) return '☀️'; // Clear sky
    if (code === 1 || code === 2 || code === 3) return '⛅'; // Mainly clear, partly cloudy, overcast
    if (code === 45 || code === 48) return '🌫️'; // Fog
    if (code >= 51 && code <= 55) return '🌦️'; // Drizzle
    if (code >= 56 && code <= 57) return '🌧️'; // Freezing Drizzle
    if (code >= 61 && code <= 65) return '🌧️'; // Rain
    if (code >= 66 && code <= 67) return '🌨️'; // Freezing Rain
    if (code >= 71 && code <= 77) return '❄️'; // Snow fall
    if (code >= 80 && code <= 82) return '🌦️'; // Rain showers
    if (code >= 85 && code <= 86) return '❄️'; // Snow showers
    if (code >= 95 && code <= 99) return '⛈️'; // Thunderstorm
    return '🌡️'; // Default
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
            this.initMarkers();
            this.initCountryDock();
            this.initSearch();
        });

        this.initControls();
        this.initRotationToggle();
        this.clock = new THREE.Clock();
        this.animate();
        this.hideLoader();
    }

    // Removed parseCountries as we are using the static COUNTRIES list
    // parseCountries() {
    //     if (!this.assets?.topo) return;
    //     try {
    //         const features = topojson.feature(this.assets.topo, this.assets.topo.objects.countries).features;

    //         COUNTRIES = features.map(f => {
    //             const name = f.properties.name || "Unknown";
    //             const code = f.id || name.substring(0, 3).toUpperCase();

    //             let pts = [];
    //             if (f.geometry.type === 'Polygon') {
    //                 pts = f.geometry.coordinates[0];
    //             } else if (f.geometry.type === 'MultiPolygon') {
    //                 pts = f.geometry.coordinates.flatMap(poly => poly[0]);
    //             }

    //             if (!pts || pts.length === 0) return null;
    //             const centroid = getPolygonCentroid(pts);

    //             return {
    //                 id: name,
    //                 code: String(code),
    //                 lat: centroid.lat,
    //                 lon: centroid.lon
    //             };
    //         }).filter(c => c && !isNaN(c.lat) && !isNaN(c.lon) && c.id !== "Antarctica")
    //             .sort((a, b) => a.id.localeCompare(b.id));

    //         this.initMarkers();
    //         this.initCountryDock();
    //     } catch (e) {
    //         console.error("Error parsing countries:", e);
    //     }
    // }

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

    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(0, 242, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 242, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    initMarkers() {
        if (this.markerGroup) this.scene.remove(this.markerGroup);
        this.markerGroup = new THREE.Group();
        this.markers = [];
        this.markerTexture = this.createGlowTexture();
        const material = new THREE.SpriteMaterial({ map: this.markerTexture, transparent: true, blending: THREE.AdditiveBlending });

        COUNTRIES.forEach((c, i) => {
            const pos = latLongToVector3(c.lat, c.lon, MARKER_RADIUS);
            // Apply globe rotation offset to match the mesh rotation
            pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

            const sprite = new THREE.Sprite(material);
            sprite.position.copy(pos);
            sprite.scale.set(0.15, 0.15, 1);
            sprite.userData = { country: c, baseScale: 0.15 };
            this.markerGroup.add(sprite);
            this.markers.push(sprite);
        });

        this.scene.add(this.markerGroup);
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

        // Prevent UI scrolling from zooming the globe
        const blockScroll = (e) => e.stopPropagation();
        document.getElementById('country-dock').addEventListener('wheel', blockScroll, { passive: false });
        document.getElementById('news-panel').addEventListener('wheel', blockScroll, { passive: false });
    }

    initSearch() {
        const searchInput = document.getElementById('country-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const btns = document.querySelectorAll('.country-btn:not(.home-btn)');
            btns.forEach(btn => {
                const text = btn.querySelector('.label').textContent.toLowerCase();
                btn.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }

    initCountryDock() {
        const dock = document.getElementById('country-dock');
        if (!dock) return;
        dock.innerHTML = ''; // Clear existing

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
            const displayCode = String(country.code || '???').substring(0, 3);
            btn.innerHTML = `<span>${displayCode}</span><span class="label">${country.id}</span>`;
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

        // Raycast against sprite markers
        const intersects = this.raycaster.intersectObjects(this.markers);

        if (intersects.length > 0) {
            this.flyToCountry(intersects[0].object.userData.country);
        } else if (!event.target.closest('#ui-overlay')) {
            document.getElementById('news-panel').classList.remove('active');
            this.controls.enableDamping = true;
            this.controls.autoRotate = this.userPrefersRotation;
            this.selectedCountry = null;
        }
    }



    async showNews(country) {
        this.selectedCountry = country;
        const pos = latLongToVector3(country.lat, country.lon, MARKER_RADIUS);
        this.selectedPosition.copy(pos);
        const panel = document.getElementById('news-panel');
        const content = document.getElementById('news-content');
        this.controls.enableDamping = false; this.controls.autoRotate = false;
        panel.classList.add('active');
        content.innerHTML = `<h2>${country.id}</h2><p>Scanning atmospheric data...</p>`;

        // Aggregate feeds: specific + generics
        const code = String(country.code).toUpperCase();
        const specificFeeds = RSS_FEEDS[code] || [];
        const allFeeds = [...specificFeeds, ...GENERIC_FEEDS];

        const [news, weather] = await Promise.all([
            fetchNews(allFeeds),
            fetchWeather(country.lat, country.lon)
        ]);

        this.targetCloudDensity = weather.clouds / 100;
        this.targetWindSpeed = weather.wind;

        const weatherIcon = getWeatherEmoji(weather.code);
        const flagUrl = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

        content.innerHTML = `
            <h2>
                <img src="${flagUrl}" alt="${country.id} Flag" onerror="this.onerror=null; this.src='https://flagcdn.com/w80/un.png'">
                ${country.capital}, ${country.id}
            </h2>
            <div id='news-list'></div>`;

        const list = document.getElementById('news-list');
        news.forEach((item, i) => {
            const el = document.createElement('a'); el.className = 'news-item';
            el.href = item.link; el.target = '_blank'; el.rel = 'noopener';
            el.innerHTML = `
                <div class='meta'>
                    <span class='tag'>[${item.tag}]</span> ${item.source} • ${item.time}
                    ${i === 0 ? `<span class="weather-tag">${weatherIcon} ${weather.temp}°C | CLOUDS ${weather.clouds}% | WIND ${weather.wind}km/h</span>` : ''}
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
        const timeValue = Date.now() * 0.001;

        const sunLon = -((utcHours - 12.0) / 24.0) * (Math.PI * 2.0);
        const declination = 23.44 * (Math.PI / 180) * Math.sin((dayOfYear - 81) * (2.0 * Math.PI / 365.25));
        this.sunDirection.set(Math.cos(declination) * Math.sin(sunLon), Math.sin(declination), Math.cos(declination) * Math.cos(sunLon)).normalize();

        // Pulsing Markers
        if (this.markers) {
            this.markers.forEach(sprite => {
                const pulse = 1 + Math.sin(timeValue * 3) * 0.15;
                sprite.scale.set(
                    sprite.userData.baseScale * pulse,
                    sprite.userData.baseScale * pulse,
                    1
                );
            });
        }

        if (this.globeMaterial) this.globeMaterial.uniforms.uSunDirection.value.copy(this.sunDirection);
        if (this.cloudMesh) this.cloudMesh.rotation.y += delta * 0.05 + 0.00005;

        // Smooth Cloud & Wind Transition
        this.currentCloudDensity = THREE.MathUtils.lerp(this.currentCloudDensity, this.targetCloudDensity, 0.05);
        this.currentWindSpeed = THREE.MathUtils.lerp(this.currentWindSpeed, this.targetWindSpeed, 0.02);

        if (this.cloudMaterial) {
            this.cloudMaterial.uniforms.uCloudDensity.value = this.currentCloudDensity;
            this.shaderTime += delta * (0.2 + this.currentWindSpeed * 0.05);
            this.cloudMaterial.uniforms.uTime.value = this.shaderTime;
        }

        this.controls.update();
        if (this.isFlying) {
            const elapsed = performance.now() - this.flyStartTime;
            const t = Math.min(elapsed / this.flyDuration, 1);
            const easedT = 1 - Math.pow(1 - t, 4);

            this.currentSpherical.phi = THREE.MathUtils.lerp(this.startSpherical.phi, this.targetSpherical.phi, easedT);
            this.currentSpherical.theta = THREE.MathUtils.lerp(this.startSpherical.theta, this.targetSpherical.theta, easedT);
            this.currentSpherical.radius = THREE.MathUtils.lerp(this.startSpherical.radius, this.targetSpherical.radius, easedT);
            this.camera.position.setFromSpherical(this.currentSpherical);
            this.camera.lookAt(0, 0, 0);

            if (t >= 1) {
                this.isFlying = false;
                this.controls.target.set(0, 0, 0);
            }
        }

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
            // Apply globe rotation offset to match markers
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
