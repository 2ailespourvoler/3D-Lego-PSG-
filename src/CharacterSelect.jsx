import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { CHARACTERS } from './characters'

// Modèle 3D centré, normalisé en taille, qui tourne lentement sur lui-même
function SpinningModel({ url }) {
  const ref = useRef(null)
  const { scene } = useGLTF(url)
  const model = useMemo(() => cloneSkeleton(scene), [scene])

  const fit = useMemo(() => {
    const b = new THREE.Box3().setFromObject(scene)
    const c = new THREE.Vector3(); b.getCenter(c)
    const s = new THREE.Vector3(); b.getSize(s)
    const maxd = Math.max(s.x, s.y, s.z) || 1
    const scale = 2.2 / maxd
    return { scale, offset: [-c.x * scale, -c.y * scale, -c.z * scale] }
  }, [scene])

  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.7
  })

  return (
    <group ref={ref}>
      <primitive object={model} scale={fit.scale} position={fit.offset} />
    </group>
  )
}

function Card({ char, onPick }) {
  return (
    <button className="char-card" onClick={() => onPick(char.id)}>
      <div className="char-canvas">
        <Canvas camera={{ position: [0, 0, 4], fov: 35 }} gl={{ alpha: true }}>
          <ambientLight intensity={0.95} />
          <directionalLight position={[3, 5, 4]} intensity={1.3} />
          <Suspense fallback={null}>
            <SpinningModel url={char.url} />
          </Suspense>
        </Canvas>
      </div>
      <div className="char-name">{char.name}</div>
    </button>
  )
}

export default function CharacterSelect({ title, color, onPick }) {
  return (
    <div className="overlay select-overlay">
      <div className="select-title" style={{ color }}>{title}</div>
      <div className="select-grid">
        {CHARACTERS.map((c) => (
          <Card key={c.id} char={c} onPick={onPick} />
        ))}
      </div>
    </div>
  )
}
