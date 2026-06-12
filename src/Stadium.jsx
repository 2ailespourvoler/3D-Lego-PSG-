import { useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Instances, Instance } from '@react-three/drei'
import { PITCH } from './game'

// ---- Texture du terrain : pelouse rayée + lignes blanches ----
function makePitchTexture() {
  const w = 1024
  const h = 683
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')

  // Bandes de pelouse (tonte)
  const stripes = 12
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#3f8a4a' : '#368043'
    ctx.fillRect((i / stripes) * w, 0, w / stripes + 1, h)
  }

  // Lignes blanches
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 4
  const m = 28
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)            // contour
  ctx.beginPath(); ctx.moveTo(w / 2, m); ctx.lineTo(w / 2, h - m); ctx.stroke() // médiane
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 72, 0, Math.PI * 2); ctx.stroke()      // rond central
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2); ctx.fill()         // point central

  // Surfaces de réparation
  const boxW = 110, boxH = 270
  ctx.strokeRect(m, (h - boxH) / 2, boxW, boxH)
  ctx.strokeRect(w - m - boxW, (h - boxH) / 2, boxW, boxH)
  // Petites surfaces (buts)
  const sW = 48, sH = 130
  ctx.strokeRect(m, (h - sH) / 2, sW, sH)
  ctx.strokeRect(w - m - sW, (h - sH) / 2, sW, sH)

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  return tex
}

// ---- Génération des gradins et du public ----
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

      // La terrasse (un long pavé) sous cette rangée
      const stepLen = alongHalf * 2 + 2
      const stepH = 1.3
      if (axis === 'x') {
        steps.push({ pos: [0, terraceTopY - stepH / 2, side * dist], size: [stepLen, stepH, rowDepth] })
      } else {
        steps.push({ pos: [side * dist, terraceTopY - stepH / 2, 0], size: [rowDepth, stepH, stepLen] })
      }

      // Les spectateurs sur la terrasse
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
  addStand('x', 1, hx + 3, hz + gap)   // tribune côté +Z
  addStand('x', -1, hx + 3, hz + gap)  // tribune côté -Z
  addStand('z', 1, hz + 3, hx + gap)   // tribune côté +X
  addStand('z', -1, hz + 3, hx + gap)  // tribune côté -X

  return { steps, bodies, heads }
}

function Goal({ x, flip }) {
  const dir = flip ? -1 : 1
  const postH = 2.4
  const goalW = 7
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[dir * 0.4, postH / 2, goalW / 2]}>
        <boxGeometry args={[0.15, postH, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[dir * 0.4, postH / 2, -goalW / 2]}>
        <boxGeometry args={[0.15, postH, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[dir * 0.4, postH, 0]}>
        <boxGeometry args={[0.15, 0.15, goalW]} />
        <meshStandardMaterial color="#ffffff" />
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

  return (
    <group>
      {/* Terrain avec lignes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[hx * 2, hz * 2]} />
        <meshStandardMaterial map={pitchTex} />
      </mesh>

      {/* Buts */}
      <Goal x={-hx + 0.5} />
      <Goal x={hx - 0.5} flip />

      {/* Gradins */}
      {steps.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color="#9aa6b2" />
        </mesh>
      ))}

      {/* Public : corps (couleurs variées) */}
      <Instances limit={bodies.length} range={bodies.length}>
        <cylinderGeometry args={[0.32, 0.34, 0.7, 8]} />
        <meshStandardMaterial />
        {bodies.map((b, i) => (
          <Instance key={i} position={b.pos} color={b.color} />
        ))}
      </Instances>

      {/* Public : têtes de Lego (jaunes) */}
      <Instances limit={heads.length} range={heads.length}>
        <cylinderGeometry args={[0.26, 0.26, 0.32, 10]} />
        <meshStandardMaterial color="#f5cd2f" />
        {heads.map((hd, i) => (
          <Instance key={i} position={hd.pos} />
        ))}
      </Instances>

      {/* Murs invisibles : le joueur reste sur le terrain */}
      <Walls hx={hx} hz={hz} />
    </group>
  )
}
