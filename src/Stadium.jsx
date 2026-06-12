import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Instances, Instance } from '@react-three/drei'
import { PITCH } from './game'

// Paramètres de la texture du terrain (servent aussi à placer buts et drapeaux)
const TEX_W = 1024
const TEX_H = 683
const TEX_MARGIN = 28 // marge des lignes blanches, en pixels

function makePitchTexture() {
  const cv = document.createElement('canvas')
  cv.width = TEX_W
  cv.height = TEX_H
  const ctx = cv.getContext('2d')

  const stripes = 12
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#3f8a4a' : '#368043'
    ctx.fillRect((i / stripes) * TEX_W, 0, TEX_W / stripes + 1, TEX_H)
  }

  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 4
  const m = TEX_MARGIN
  const w = TEX_W
  const h = TEX_H
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)
  ctx.beginPath(); ctx.moveTo(w / 2, m); ctx.lineTo(w / 2, h - m); ctx.stroke()
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 72, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2); ctx.fill()

  const boxW = 110, boxH = 270
  ctx.strokeRect(m, (h - boxH) / 2, boxW, boxH)
  ctx.strokeRect(w - m - boxW, (h - boxH) / 2, boxW, boxH)
  const sW = 48, sH = 130
  ctx.strokeRect(m, (h - sH) / 2, sW, sH)
  ctx.strokeRect(w - m - sW, (h - sH) / 2, sW, sH)

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  return tex
}

function buildCrowd(hx, hz) {
  const steps = []
  const bodies = []
  const heads = []
  const palette = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#ecf0f1', '#1abc9c']
  const rows = 4
  const rowRise = 0.9
  const rowDepth = 1.7
  const seatGap = 2.0

  function addStand(axis, side, alongHalf, startDist) {
    const cols = Math.floor((alongHalf * 2) / seatGap)
    for (let r = 0; r < rows; r++) {
      const terraceTopY = 0.4 + r * rowRise
      const dist = startDist + r * rowDepth
      const stepLen = alongHalf * 2 + 2
      const stepH = 1.3
      if (axis === 'x') {
        steps.push({ pos: [0, terraceTopY - stepH / 2, side * dist], size: [stepLen, stepH, rowDepth] })
      } else {
        steps.push({ pos: [side * dist, terraceTopY - stepH / 2, 0], size: [rowDepth, stepH, stepLen] })
      }
      for (let c = 0; c <= cols; c++) {
        const along = -alongHalf + (c / cols) * alongHalf * 2
        const x = axis === 'x' ? along : side * dist
        const z = axis === 'x' ? side * dist : along
        const color = palette[(r + c) % palette.length]
        bodies.push({ pos: [x, terraceTopY + 0.35, z], color })
        heads.push({ pos: [x, terraceTopY + 0.86, z] })
      }
    }
  }

  const gap = 2
  addStand('x', 1, hx + 3, hz + gap)
  addStand('x', -1, hx + 3, hz + gap)
  addStand('z', 1, hz + 3, hx + gap)
  addStand('z', -1, hz + 3, hx + gap)

  return { steps, bodies, heads }
}

// Texture de filet : grille blanche qui se répète
let _netTex = null
function getNetTexture() {
  if (_netTex) return _netTex
  const s = 64
  const cv = document.createElement('canvas')
  cv.width = s
  cv.height = s
  const ctx = cv.getContext('2d')
  ctx.clearRect(0, 0, s, s)
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  _netTex = tex
  return tex
}

function quadGeom(p0, p1, p2, p3, uRep, vRep) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...p0, ...p1, ...p2, ...p0, ...p2, ...p3]), 3))
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, uRep, 0, uRep, vRep, 0, 0, uRep, vRep, 0, vRep]), 2))
  g.computeVertexNormals()
  return g
}

function triGeom(p0, p1, p2, uRep, vRep) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...p0, ...p1, ...p2]), 3))
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, uRep, 0, 0, vRep]), 2))
  g.computeVertexNormals()
  return g
}

function Goal({ lineX }) {
  const postH = 2.4
  const goalW = 7
  const w = goalW / 2
  const netDepth = 1.5
  const outDir = Math.sign(lineX) || 1
  const cell = 0.3
  const slopeLen = Math.hypot(netDepth, postH)
  const netTex = getNetTexture()

  const geoms = useMemo(() => {
    const back = quadGeom(
      [0, postH, w], [0, postH, -w], [outDir * netDepth, 0, -w], [outDir * netDepth, 0, w],
      goalW / cell, slopeLen / cell
    )
    const sideA = triGeom([0, 0, w], [0, postH, w], [outDir * netDepth, 0, w], netDepth / cell, postH / cell)
    const sideB = triGeom([0, 0, -w], [0, postH, -w], [outDir * netDepth, 0, -w], netDepth / cell, postH / cell)
    return { back, sideA, sideB }
  }, [outDir, w, netDepth, postH, slopeLen])

  const netMat = () => (
    <meshStandardMaterial map={netTex} alphaTest={0.5} side={THREE.DoubleSide} color="#ffffff" roughness={0.9} />
  )

  return (
    <>
      {/* Cadre solide : poteaux + barre transversale */}
      <RigidBody type="fixed" colliders="cuboid" position={[lineX, 0, 0]}>
        <mesh position={[0, postH / 2, w]} castShadow>
          <boxGeometry args={[0.15, postH, 0.15]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, postH / 2, -w]} castShadow>
          <boxGeometry args={[0.15, postH, 0.15]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, postH, 0]} castShadow>
          <boxGeometry args={[0.15, 0.15, goalW + 0.15]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* Filets + barres de fixation au sol (décoratif) */}
      <group position={[lineX, 0, 0]}>
        <mesh geometry={geoms.back}>{netMat()}</mesh>
        <mesh geometry={geoms.sideA}>{netMat()}</mesh>
        <mesh geometry={geoms.sideB}>{netMat()}</mesh>

        <mesh position={[outDir * netDepth, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.1, goalW]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[(outDir * netDepth) / 2, 0.05, w]}>
          <boxGeometry args={[netDepth, 0.1, 0.12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[(outDir * netDepth) / 2, 0.05, -w]}>
          <boxGeometry args={[netDepth, 0.1, 0.12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>

      {/* Filet solide : le joueur et le ballon ne le traversent pas */}
      <RigidBody type="fixed" colliders={false} position={[lineX, 0, 0]}>
        <CuboidCollider args={[0.1, postH / 2, w]} position={[outDir * netDepth, postH / 2, 0]} />
        <CuboidCollider args={[netDepth / 2, postH / 2, 0.1]} position={[(outDir * netDepth) / 2, postH / 2, w]} />
        <CuboidCollider args={[netDepth / 2, postH / 2, 0.1]} position={[(outDir * netDepth) / 2, postH / 2, -w]} />
      </RigidBody>
    </>
  )
}

function CornerFlag({ x, z, dir }) {
  const poleH = 1.3
  const flagVerts = useMemo(
    () => new Float32Array([0, 0, 0, 0.55 * dir, -0.1, 0, 0, -0.28, 0]),
    [dir]
  )
  return (
    <group position={[x, 0, z]}>
      {/* Mât solide (le ballon et le joueur le percutent) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, poleH / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, poleH, 8]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
      </RigidBody>
      {/* Fanion décoratif (pas de collision) */}
      <mesh position={[0, poleH - 0.05, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[flagVerts, 3]} />
        </bufferGeometry>
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Walls({ hx, hz }) {
  const hgt = 1.5
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[0.3, hgt, hz + 2]} position={[hx + 0.3, hgt, 0]} />
      <CuboidCollider args={[0.3, hgt, hz + 2]} position={[-hx - 0.3, hgt, 0]} />
      <CuboidCollider args={[hx + 2, hgt, 0.3]} position={[0, hgt, hz + 0.3]} />
      <CuboidCollider args={[hx + 2, hgt, 0.3]} position={[0, hgt, -hz - 0.3]} />
    </RigidBody>
  )
}

export default function Stadium() {
  const pitchTex = useMemo(makePitchTexture, [])
  const hx = PITCH.hx
  const hz = PITCH.hz
  const { steps, bodies, heads } = useMemo(() => buildCrowd(hx, hz), [hx, hz])

  // Position des lignes blanches (alignée sur la texture)
  const insetX = (TEX_MARGIN / TEX_W) * (hx * 2)
  const insetZ = (TEX_MARGIN / TEX_H) * (hz * 2)
  const lineX = hx - insetX
  const lineZ = hz - insetZ
  const corners = [
    [lineX, lineZ],
    [lineX, -lineZ],
    [-lineX, lineZ],
    [-lineX, -lineZ],
  ]

  return (
    <group>
      {/* Terrain avec lignes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[hx * 2, hz * 2]} />
        <meshStandardMaterial map={pitchTex} />
      </mesh>

      {/* Buts : posés sur la ligne blanche */}
      <Goal lineX={lineX} />
      <Goal lineX={-lineX} />

      {/* Drapeaux de coin */}
      {corners.map(([x, z], i) => (
        <CornerFlag key={i} x={x} z={z} dir={x > 0 ? -1 : 1} />
      ))}

      {/* Gradins */}
      {steps.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color="#9aa6b2" />
        </mesh>
      ))}

      {/* Public : corps */}
      <Instances limit={bodies.length} range={bodies.length}>
        <cylinderGeometry args={[0.32, 0.34, 0.7, 8]} />
        <meshStandardMaterial />
        {bodies.map((b, i) => (
          <Instance key={i} position={b.pos} color={b.color} />
        ))}
      </Instances>

      {/* Public : têtes de Lego */}
      <Instances limit={heads.length} range={heads.length}>
        <cylinderGeometry args={[0.26, 0.26, 0.32, 10]} />
        <meshStandardMaterial color="#f5cd2f" />
        {heads.map((hd, i) => (
          <Instance key={i} position={hd.pos} />
        ))}
      </Instances>

      <Walls hx={hx} hz={hz} />
    </group>
  )
}
