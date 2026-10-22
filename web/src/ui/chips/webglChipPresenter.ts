import {
  CanvasTexture,
  CircleGeometry,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
} from 'three'
import { REFERENCE_HEIGHT } from '../../config/constants'
import { LAY_CHIP_DIAMETER_RATIO, type ChipColor, type ChipMarker } from '../chipConstants'
import { PUCK_IMAGE_WIDTH_PX } from '../diceConstants'
import { compareDepth, PUCK_PLATE } from '../feltDepth'
import { chipDrawSize, type ChipDisc } from '../chipPhysics'
import type { PuckPlacement } from '../puckState'
import { chipHex, paintChipCell, paintMarkerCell } from './chipFace'
import { CHIP_PALETTE } from './chipPalette'
import {
  CHIP_CAMERA_BOTTOM,
  CHIP_CAMERA_LEFT,
  CHIP_CAMERA_RIGHT,
  CHIP_CAMERA_TOP,
  chipDiscMatrix,
} from './chipWebglPose'
import {
  CHIP_WEBGL_CYLINDER_SEGMENTS,
  CHIP_WEBGL_MAX_INSTANCES,
  resolveChipCanvasDprCap,
} from './chipWebglConstants'

const COLORS: ChipColor[] = ['white', 'red', 'green', 'blue', 'black']
const MARKERS: ChipMarker[] = ['lay', 'odds', 'dc', 'come']

const ATLAS_CELL = 256
const ATLAS_COLS = COLORS.length + MARKERS.length
const ATLAS_ROWS = 2

/**
 * Wall row is the top of the canvas, face row the bottom.
 * With `flipY`, that is texture v 0.5–1 and 0–0.5.
 */
const paintAtlas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_CELL * ATLAS_COLS
  canvas.height = ATLAS_CELL * ATLAS_ROWS
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  COLORS.forEach((color, col) => {
    const palette = CHIP_PALETTE[color]
    const spot = chipHex(palette.spot)
    paintChipCell(ctx, col * ATLAS_CELL, 0, ATLAS_CELL, spot, chipHex(palette.edge), false)
    paintChipCell(ctx, col * ATLAS_CELL, ATLAS_CELL, ATLAS_CELL, spot, chipHex(palette.face), true)
  })
  MARKERS.forEach((marker, index) => {
    const col = (COLORS.length + index) * ATLAS_CELL
    paintMarkerCell(ctx, col, 0, ATLAS_CELL, marker, false)
    paintMarkerCell(ctx, col, ATLAS_CELL, ATLAS_CELL, marker, true)
  })
  return canvas
}

const atlasRect = (colorIndex: number, face: boolean): [number, number, number, number] => {
  const texW = ATLAS_CELL * ATLAS_COLS
  const texH = ATLAS_CELL * ATLAS_ROWS
  const insetU = 0.5 / texW
  const insetV = 0.5 / texH
  const scaleU = 1 / ATLAS_COLS - insetU * 2
  const scaleV = 1 / ATLAS_ROWS - insetV * 2
  const offsetU = colorIndex / ATLAS_COLS + insetU
  const offsetV = (face ? 0 : 0.5) + insetV
  return [offsetU, offsetV, scaleU, scaleV]
}

const COLOR_INDEX: Record<ChipColor, number> = {
  white: 0,
  red: 1,
  green: 2,
  blue: 3,
  black: 4,
}

const MARKER_COL: Record<ChipMarker, number> = {
  lay: COLORS.length,
  odds: COLORS.length + 1,
  dc: COLORS.length + 2,
  come: COLORS.length + 3,
}

const tempMatrix = new Matrix4()

interface DrawEntry {
  feltZ: number
  plate: number
  disc?: ChipDisc
  puck?: PuckPlacement
}

const drawEntries = (discs: readonly ChipDisc[], pucks: readonly PuckPlacement[]): DrawEntry[] => {
  const entries: DrawEntry[] = []
  for (let i = 0; i < discs.length; i += 1) {
    const disc = discs[i]
    entries.push({ feltZ: disc.feltZ, plate: disc.zIndex, disc })
  }
  for (let i = 0; i < pucks.length; i += 1) {
    const puck = pucks[i]
    entries.push({ feltZ: REFERENCE_HEIGHT - puck.y, plate: PUCK_PLATE, puck })
  }
  entries.sort(compareDepth)
  return entries
}

const VERTEX = `
attribute vec4 uvRect;
varying vec2 vUv;
void main() {
  vec2 faceUv = vec2(uv.x, 1.0 - uv.y);
  vUv = faceUv * uvRect.zw + uvRect.xy;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const FRAGMENT = `
uniform sampler2D map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv);
}
`

const PUCK_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const PUCK_FRAGMENT = `
uniform sampler2D map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv);
}
`

/** Flat discs in stage pixel space (1080×1920, Y down), painted like the CSS chips. */
export class WebGLChipPresenter {
  private readonly canvas: HTMLCanvasElement

  private readonly renderer: WebGLRenderer

  private readonly scene = new Scene()

  private readonly camera: OrthographicCamera

  private readonly geometry: CircleGeometry

  private readonly texture: CanvasTexture

  private readonly material: ShaderMaterial

  private readonly mesh: InstancedMesh

  private readonly uvRect: InstancedBufferAttribute

  private readonly puckGeometry: PlaneGeometry

  private readonly puckMaterial: ShaderMaterial

  private readonly puckMesh: Mesh

  private readonly puckTextures = new Map<string, Texture>()

  private disposed = false

  private readonly maxDpr: number

  private readonly capacity: number

  constructor(container: HTMLElement, maxDpr: number) {
    this.maxDpr = maxDpr
    this.capacity = CHIP_WEBGL_MAX_INSTANCES * COLORS.length
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'chip-canvas'
    container.appendChild(this.canvas)

    this.camera = new OrthographicCamera(
      CHIP_CAMERA_LEFT,
      CHIP_CAMERA_RIGHT,
      CHIP_CAMERA_TOP,
      CHIP_CAMERA_BOTTOM,
      -2000,
      2000,
    )
    this.camera.position.set(0, 0, 500)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = LinearSRGBColorSpace

    this.texture = new CanvasTexture(paintAtlas())
    this.texture.flipY = true
    this.texture.magFilter = LinearFilter
    this.texture.minFilter = LinearFilter
    this.texture.generateMipmaps = false
    this.texture.needsUpdate = true

    this.geometry = new CircleGeometry(1, CHIP_WEBGL_CYLINDER_SEGMENTS)
    this.uvRect = new InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4)
    this.geometry.setAttribute('uvRect', this.uvRect)

    this.material = new ShaderMaterial({
      uniforms: { map: { value: this.texture } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    })

    this.mesh = new InstancedMesh(this.geometry, this.material, this.capacity)
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    this.scene.add(this.mesh)

    const puckPlaceholder = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    puckPlaceholder.needsUpdate = true
    puckPlaceholder.colorSpace = LinearSRGBColorSpace
    this.puckGeometry = new PlaneGeometry(1, 1)
    this.puckMaterial = new ShaderMaterial({
      uniforms: { map: { value: puckPlaceholder } },
      vertexShader: PUCK_VERTEX,
      fragmentShader: PUCK_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    })
    this.puckMesh = new Mesh(this.puckGeometry, this.puckMaterial)
    this.puckMesh.frustumCulled = false
    this.puckMesh.visible = false
    this.scene.add(this.puckMesh)
    this.renderer.autoClear = false

    this.handleContextLoss()
    this.resize(maxDpr)
  }

  private handleContextLoss(): void {
    this.canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault()
      },
      false,
    )
    this.canvas.addEventListener(
      'webglcontextrestored',
      () => {
        this.texture.needsUpdate = true
        this.resize(this.maxDpr)
      },
      false,
    )
  }

  resize(maxDpr: number): void {
    if (this.disposed) return
    const dpr = Math.min(window.devicePixelRatio || 1, resolveChipCanvasDprCap(maxDpr))
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(CHIP_CAMERA_RIGHT, CHIP_CAMERA_BOTTOM, false)
    this.canvas.style.width = `${CHIP_CAMERA_RIGHT}px`
    this.canvas.style.height = `${CHIP_CAMERA_BOTTOM}px`
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.scene.remove(this.mesh)
    this.scene.remove(this.puckMesh)
    this.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
    this.puckGeometry.dispose()
    this.puckMaterial.dispose()
    for (const tex of this.puckTextures.values()) tex.dispose()
    this.puckTextures.clear()
    this.renderer.dispose()
    this.canvas.remove()
  }

  private puckTexture(src: string): Texture | null {
    let tex = this.puckTextures.get(src)
    if (!tex) {
      const image = new Image()
      const created = new Texture(image)
      // This camera's +Y points down the screen, so the PNG must not get the usual Y-up flip.
      created.flipY = false
      created.colorSpace = LinearSRGBColorSpace
      created.magFilter = LinearFilter
      created.minFilter = LinearFilter
      created.generateMipmaps = false
      image.onload = () => {
        created.needsUpdate = true
      }
      image.src = src
      if (image.complete && image.naturalWidth > 0) created.needsUpdate = true
      tex = created
      this.puckTextures.set(src, tex)
    }
    const image = tex.image as HTMLImageElement | undefined
    if (!image?.complete || image.naturalWidth <= 0) return null
    return tex
  }

  private uploadDiscs(discs: readonly ChipDisc[]): void {
    const count = Math.min(discs.length, this.capacity)
    const radiusOf = chipDrawSize().width / 2
    const uv = this.uvRect.array as Float32Array
    for (let i = 0; i < count; i += 1) {
      const disc = discs[i]
      const marker = disc.marker
      chipDiscMatrix(disc, radiusOf * disc.scale * (marker ? LAY_CHIP_DIAMETER_RATIO : 1), tempMatrix)
      this.mesh.setMatrixAt(i, tempMatrix)
      const rect = atlasRect(marker ? MARKER_COL[marker] : COLOR_INDEX[disc.color], disc.face)
      const offset = i * 4
      uv[offset] = rect[0]
      uv[offset + 1] = rect[1]
      uv[offset + 2] = rect[2]
      uv[offset + 3] = rect[3]
    }
    this.mesh.count = count
    this.mesh.instanceMatrix.needsUpdate = true
    this.uvRect.needsUpdate = true
  }

  private renderDiscs(discs: readonly ChipDisc[]): void {
    if (discs.length === 0) return
    this.uploadDiscs(discs)
    this.mesh.visible = true
    this.puckMesh.visible = false
    this.renderer.render(this.scene, this.camera)
    this.mesh.visible = false
  }

  private renderPuck(puck: PuckPlacement): void {
    const tex = this.puckTexture(puck.src)
    if (!tex) return
    const image = tex.image as HTMLImageElement
    const width = PUCK_IMAGE_WIDTH_PX * puck.scale
    const height = width * (image.naturalHeight / image.naturalWidth)
    this.puckMaterial.uniforms.map.value = tex
    this.puckMesh.position.set(puck.x, puck.y, 0)
    this.puckMesh.scale.set(width, height, 1)
    this.mesh.visible = false
    this.puckMesh.visible = true
    this.renderer.render(this.scene, this.camera)
    this.puckMesh.visible = false
  }

  apply(discs: readonly ChipDisc[], pucks: readonly PuckPlacement[] = []): void {
    if (this.disposed) return
    const entries = drawEntries(discs, pucks)
    this.renderer.clear()
    this.mesh.visible = false
    this.puckMesh.visible = false
    let batch: ChipDisc[] = []
    const flush = () => {
      this.renderDiscs(batch)
      batch = []
    }
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i]
      if (entry.disc) batch.push(entry.disc)
      else if (entry.puck) {
        flush()
        this.renderPuck(entry.puck)
      }
    }
    flush()
  }
}
