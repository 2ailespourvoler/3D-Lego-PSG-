import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { ballStore } from './game'

const R = 0.17 // rayon du ballon (~1/4 de la hauteur du personnage)

function useIcoPentagons() {
  return useMemo(() => {
    const phi = (1 + Math.sqrt(5)) / 2
    const raw = [
      [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
      [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
      [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1],
    ]
    const up = new THREE.Vector3(0, 0, 1)
    return raw.map(([x, y, z]) => {
      const dir = new THREE.Vector3(x, y, z).normalize()
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
      const pos = dir.clone().multiplyScalar(R * 1.001)
      return { pos: [pos.x, pos.y, pos.z], quat: [quat.x, quat.y, quat.z, quat.w] }
    })
  }, [])
}

export default function Ball({ position = [0, R, 0] }) {
  const pentagons = useIcoPentagons()
  const body = useRef(null)

  // Enregistre le corps du ballon pour que le joueur puisse le frapper
  useEffect(() => {
    ballStore.body = body.current
    return () => {
      if (ballStore.body === body.current) ballStore.body = null
    }
  }, [])

  return (
    <RigidBody
      ref={body}
      colliders={false}
      ccd
      position={position}
      restitution={0.4}
      friction={0.7}
      linearDamping={0.6}
      angularDamping={0.5}
    >
      <BallCollider args={[R]} />

      <mesh castShadow>
        <sphereGeometry args={[R, 32, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>

      {pentagons.map((p, i) => (
        <mesh key={i} position={p.pos} quaternion={p.quat}>
          <circleGeometry args={[R * 0.42, 5]} />
          <meshStandardMaterial color="#141414" roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </RigidBody>
  )
}
