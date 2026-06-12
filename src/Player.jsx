import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import { input } from './input'
import { playerPos, ballStore } from './game'

const SPEED = 5

// --- Réglages du modèle ---
const MODEL_URL = '/personnage.glb'
const MODEL_SCALE = 0.7
const MODEL_FACING = 0
const ANIM_SPEED = 1.2   // vitesse de la course
const KICK_SPEED = 1.3   // vitesse de l'animation de coup de pied
// --- Réglages du coup de pied dans le ballon ---
const KICK_RANGE = 1.8   // distance max pour toucher le ballon
const KICK_POWER = 0.5   // force du tir (montez pour un tir plus puissant)
const KICK_UP = 0.12     // petite hauteur donnée au ballon
// --------------------------

export default function Player() {
  const body = useRef(null)
  const visual = useRef(null)
  const running = useRef(false)
  const kicking = useRef(false)
  const kickEnd = useRef(0)

  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(animations, visual)

  const runName = useMemo(() => {
    if (!names || names.length === 0) return null
    return names.find((n) => /run|cours|sprint|jog|walk|march/i.test(n)) || names[0]
  }, [names])

  const kickName = useMemo(() => {
    if (!names || names.length === 0) return null
    return names.find((n) => /kick|tir|shoot|coup|punt/i.test(n)) || null
  }, [names])

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) o.castShadow = true
    })
  }, [scene])

  const groundY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    return -0.5 - MODEL_SCALE * box.min.y
  }, [scene])

  const move = new THREE.Vector3()
  const camTarget = new THREE.Vector3()
  const camDesired = new THREE.Vector3()
  const camOffset = new THREE.Vector3(0, 6, 10)

  useFrame((state, delta) => {
    if (!body.current) return
    const now = performance.now() / 1000

    move.set(input.x, 0, input.z)
    if (move.lengthSq() > 1) move.normalize()
    const moving = move.lengthSq() > 0.0001

    const vel = body.current.linvel()
    body.current.setLinvel(
      { x: move.x * SPEED, y: vel.y, z: move.z * SPEED },
      true
    )

    if (visual.current && moving) {
      const targetAngle = Math.atan2(move.x, move.z) + MODEL_FACING
      const cur = visual.current.rotation.y
      let diff = targetAngle - cur
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      visual.current.rotation.y = cur + diff * (1 - Math.pow(0.0001, delta))
    }

    const runAction = runName && actions ? actions[runName] : null
    const kickAction = kickName && actions ? actions[kickName] : null

    // Déclenchement du coup de pied (bouton A / Espace)
    if (input.kickRequested) {
      input.kickRequested = false
      if (kickAction) {
        if (runAction) { runAction.fadeOut(0.1); running.current = false }
        kickAction.reset()
        kickAction.setLoop(THREE.LoopOnce, 1)
        kickAction.clampWhenFinished = true
        kickAction.timeScale = KICK_SPEED
        kickAction.fadeIn(0.05).play()
        kicking.current = true
        kickEnd.current = now + kickAction.getClip().duration / KICK_SPEED
      }
      // Frapper le ballon s'il est à portée
      const ball = ballStore.body
      if (ball) {
        const bt = ball.translation()
        const dx = bt.x - playerPos.x
        const dz = bt.z - playerPos.z
        const d = Math.hypot(dx, dz)
        if (d < KICK_RANGE) {
          const nx = dx / (d || 1)
          const nz = dz / (d || 1)
          ball.applyImpulse({ x: nx * KICK_POWER, y: KICK_UP, z: nz * KICK_POWER }, true)
        }
      }
    }

    // Fin du coup de pied
    if (kicking.current && now >= kickEnd.current) {
      if (kickAction) kickAction.fadeOut(0.15)
      kicking.current = false
    }

    // Course / arrêt (seulement si on ne frappe pas)
    if (runAction && !kicking.current) {
      runAction.timeScale = ANIM_SPEED
      if (moving && !running.current) {
        runAction.reset().fadeIn(0.2).play()
        running.current = true
      } else if (!moving && running.current) {
        runAction.fadeOut(0.2)
        running.current = false
      }
    }

    const pos = body.current.translation()
    playerPos.x = pos.x
    playerPos.y = pos.y
    playerPos.z = pos.z

    camTarget.set(pos.x, pos.y, pos.z)
    camDesired.copy(camTarget).add(camOffset)
    const smooth = 1 - Math.pow(0.001, delta)
    state.camera.position.lerp(camDesired, smooth)
    state.camera.lookAt(camTarget)
  })

  return (
    <RigidBody ref={body} colliders={false} mass={1} lockRotations position={[-2.5, 1, 0]}>
      <CuboidCollider args={[0.5, 0.5, 0.5]} />
      <group ref={visual}>
        <primitive object={scene} scale={MODEL_SCALE} position={[0, groundY, 0]} />
      </group>
    </RigidBody>
  )
}

useGLTF.preload(MODEL_URL)
