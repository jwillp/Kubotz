import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UNIT } from '../config';
import type { TmxMap } from '../map/TmxMap';

type Img = CanvasImageSource & { width: number; height: number };
interface Rect { x: number; y: number; width: number; height: number; }

/** Depth of the arena blocks, in units. Robots walk on the middle line (z = 0). */
const BLOCK_DEPTH = 4;
const FOV = 30;
const MAX_LIGHTS = 8;

/** Mood pass: vignette, a touch of contrast and a cool/warm split tone. */
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.9 }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVignette; uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      vec3 shadowTint = vec3(0.86, 0.95, 1.12); // cool shadows
      vec3 lightTint = vec3(1.06, 1.0, 0.94); // warm highlights
      c.rgb *= mix(shadowTint, lightTint, smoothstep(0.2, 0.8, l));
      c.rgb = mix(vec3(l), c.rgb, 1.12); // saturation
      c.rgb = (c.rgb - 0.5) * 1.06 + 0.5; // contrast
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * dot(d, d) * 1.1;
      // faint scanline shimmer, like the original's arcade screen
      c.rgb *= 0.985 + 0.015 * sin(vUv.y * 900.0 + uTime * 2.0);
      gl_FragColor = c;
    }`,
};

/**
 * The 3D view of the arena: drawn on a canvas behind Phaser's (transparent)
 * canvas. The camera looks straight at the gameplay plane (z = 0), so things
 * Phaser draws in world space (labels, health bars, lasers, particles) line up
 * exactly with the 3D robots and blocks.
 */
export class World3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1280 / 768, 0.5, 600);
  private composer: EffectComposer;
  private grade: ShaderPass;
  private bloom: UnrealBloomPass;
  private key!: THREE.DirectionalLight;
  private arena = new THREE.Group();
  private lights: THREE.PointLight[] = [];
  private time = 0;
  private lowFx: boolean;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(1280, 768, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const c = this.renderer.domElement;
    c.style.position = 'absolute';
    c.style.zIndex = '0';
    c.style.display = 'none';
    c.style.pointerEvents = 'none';
    parent.style.position ||= 'relative';
    parent.prepend(c);
    // Low-effects mode (no bloom or shadows) for slow machines: ?lowfx in the URL or the F key.
    this.lowFx = new URLSearchParams(location.search).has('lowfx');
    this.renderer.shadowMap.enabled = !this.lowFx;

    this.scene.background = new THREE.Color(0x060b16);
    this.scene.fog = new THREE.Fog(0x08101f, 90, 220);
    this.scene.add(this.arena);
    this.setupLights();

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(1280, 768);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(640, 384), 0.75, 0.55, 0.72);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xb4d4ff, 0x2a2030, 1.7));
    // Soft fill from the camera side so the dark armour still reads.
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.9);
    fill.position.set(0, 4, 40);
    this.scene.add(fill);
    // Key light from the upper front left, casting shadows on the arena.
    this.key = new THREE.DirectionalLight(0xfff1e0, 3.2);
    this.key.position.set(-14, 26, 22);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;
    this.scene.add(this.key, this.key.target);
    // Cool rim light from behind, to cut the robots out of the dark background.
    const rim = new THREE.DirectionalLight(0x4fb8ff, 2.6);
    rim.position.set(18, 10, 6);
    this.scene.add(rim);
    // Pool of coloured point lights for lasers and effects.
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 7, 1.6);
      this.lights.push(l);
      this.scene.add(l);
    }
  }

  /** Bloom and shadows on/off (F key in game). */
  toggleEffects(): boolean {
    this.lowFx = !this.lowFx;
    this.renderer.shadowMap.enabled = !this.lowFx;
    this.scene.traverse((o) => { if ((o as THREE.Mesh).material) ((o as THREE.Mesh).material as THREE.Material).needsUpdate = true; });
    return !this.lowFx;
  }

  set visible(v: boolean) { this.renderer.domElement.style.display = v ? 'block' : 'none'; }

  /** Builds the arena: extruded blocks, the tile art on their faces, the backdrop. */
  buildArena(map: TmxMap, solids: Rect[], tile: (source: string) => Img | null, background: Img | null): void {
    this.arena.clear();
    const mapW = map.width * map.tileWidth;
    const mapH = map.height * map.tileHeight;

    // Tile art split in two layers: tiles on blocks go on the blocks' front face,
    // decoration elsewhere goes on a wall behind the robots.
    const front = document.createElement('canvas');
    const back = document.createElement('canvas');
    for (const c of [front, back]) { c.width = mapW; c.height = mapH; }
    const fctx = front.getContext('2d')!;
    const bctx = back.getContext('2d')!;
    for (const layer of map.layers) {
      layer.gids.forEach((gid, i) => {
        const info = map.tileImages.get(gid);
        if (!info) return;
        const img = tile(info.source);
        if (!img) return;
        const x = (i % map.width) * map.tileWidth;
        const bottom = (Math.floor(i / map.width) + 1) * map.tileHeight;
        const r = { x, y: bottom - img.height, width: img.width, height: img.height };
        const onBlock = solids.some((s) => r.x < s.x + s.width && r.x + r.width > s.x && r.y < s.y + s.height && r.y + r.height > s.y);
        (onBlock ? fctx : bctx).drawImage(img, x, bottom - img.height);
      });
    }
    const artPlane = (canvas: HTMLCanvasElement, z: number, emissive: number) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({
        map: tex, transparent: true, alphaTest: 0.05, roughness: 0.7, metalness: 0.2,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(mapW / UNIT, mapH / UNIT), mat);
      mesh.position.set(mapW / UNIT / 2, -mapH / UNIT / 2, z);
      mesh.receiveShadow = true;
      this.arena.add(mesh);
    };
    artPlane(front, BLOCK_DEPTH / 2 + 0.01, 0.55);
    artPlane(back, -BLOCK_DEPTH / 2 - 0.5, 0.5);

    // Blocks: dark metal boxes with a lit top; the front face shows the tile art.
    const side = new THREE.MeshStandardMaterial({ color: 0x1c2330, roughness: 0.55, metalness: 0.6 });
    const top = new THREE.MeshStandardMaterial({ color: 0x3a4658, roughness: 0.45, metalness: 0.5 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x29abe2, emissive: 0x29abe2, emissiveIntensity: 2.2 });
    for (const s of solids) {
      const w = s.width / UNIT;
      const h = s.height / UNIT;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, BLOCK_DEPTH), [side, side, top, side, side, side]);
      box.position.set((s.x + s.width / 2) / UNIT, -(s.y + s.height / 2) / UNIT, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      this.arena.add(box);
      // Neon strip along the back top edge, in the map's blue.
      if (w > 1.5) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.06, 0.06), edge);
        strip.position.set(box.position.x, box.position.y + h / 2, -BLOCK_DEPTH / 2 + 0.05);
        this.arena.add(strip);
      }
    }

    // Backdrop: the original background art far behind, plus a floor glow.
    if (background) {
      const tex = new THREE.Texture(background as HTMLImageElement);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      const dist = 70;
      const scale = 2.6;
      const w = (mapW / UNIT) * scale;
      const h = w * (background.height / background.width);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: false, color: 0xd0d8e0 }));
      bg.position.set(mapW / UNIT / 2, -mapH / UNIT / 2, -dist);
      this.arena.add(bg);
    }
  }

  /** Point lights (lasers, effects) for this frame, in Phaser world pixels. */
  setLights(list: { x: number; y: number; color: number; intensity: number }[]): void {
    this.lights.forEach((l, i) => {
      const s = list[i];
      if (!s) { l.intensity = 0; return; }
      l.color.setHex(s.color);
      l.intensity = s.intensity;
      l.position.set(s.x / UNIT, -s.y / UNIT, 0.8);
    });
  }

  add(o: THREE.Object3D): void { this.scene.add(o); }

  /**
   * Matches the 3D camera to Phaser's 2D camera and the canvas to Phaser's
   * canvas, then renders.
   */
  render(cam: { midPoint: { x: number; y: number }; zoom: number; width: number; height: number }, gameCanvas: HTMLCanvasElement, dtMs: number): void {
    const c = this.renderer.domElement;
    c.style.width = gameCanvas.style.width;
    c.style.height = gameCanvas.style.height;
    c.style.left = `${gameCanvas.offsetLeft}px`;
    c.style.top = `${gameCanvas.offsetTop}px`;

    const viewH = cam.height / cam.zoom / UNIT;
    const dist = viewH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const x = cam.midPoint.x / UNIT;
    const y = -cam.midPoint.y / UNIT;
    this.camera.aspect = cam.width / cam.height;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(x, y, dist);
    this.camera.lookAt(x, y, 0);
    // The shadow-casting light follows the camera.
    this.key.position.set(x - 14, y + 26, 22);
    this.key.target.position.set(x, y, 0);

    this.time += dtMs / 1000;
    this.grade.uniforms.uTime.value = this.time;
    if (this.lowFx) this.renderer.render(this.scene, this.camera);
    else this.composer.render(dtMs / 1000);
  }
}
