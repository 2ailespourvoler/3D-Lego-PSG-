import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGLTF, useAnimations } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { playerPos, ballStore } from './game'

const SPEED = 5
const MODEL_URL = '/personnage.glb'
const MODEL_SCALE = 0.7
const MODEL_FACING = 0
const ANIM_SPEED = 1.2
const KICK_SPEED = 1.3
const KICK_RANGE = 1.8
const KICK_POWER = 0.5
const KICK_UP = 0.12

export default function Player({
  source,
  spawn = [-2.5, 1, 0],
  markerColor = '#2b6cff',
  reportPos = false,
  frozen = false,
}) {
  const body = useRef(null)
  const visual = useRef(null)
  const running = useRef(false)
  const kicking = useRef(false)
  const kickEnd = useRef(0)

  const { scene, animations } = useGLTF(MODEL_URL)
  // Cloner la scène : indispensable pour afficher plusieurs personnages animés
  const model = useMemo(() => cloneSkeleton(scene), [scene])
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
    model.traverse((o) => { if (o.isMesh) o.castShadow = true })
  }, [model])

  const groundY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    return -0.5 - MODEL_SCALE * box.min.y
  }, [scene])

  const move = new THREE.Vector3()

  useFrame((state, delta) => {
    if (!body.current) return
    const now = performance.now() / 1000

    const ix = frozen ? 0 : source.x
    const iz = frozen ? 0 : source.z
    move.set(ix, 0, iz)
    if (move.lengthSq() > 1) move.normalize()
    const moving = !frozen && move.lengthSq() > 0.0001

    const vel = body.current.linvel()
    body.current.setLinvel({ x: move.x * SPEED, y: vel.y, z: move.z * SPEED }, true)

    if (visual.current && moving) {
      const targetAngle = Math.atan2(move.x, move.z) + MODEL_FACING
      const cur = visual.current.rotation.y
      let diff = targetAngle - cur
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      visual.current.rotation.y = cur + diff * (1 - Math.pow(0.0001, delta))
    }

    const runAction = runName && actions ? actions[runName] : null
    const kickAction = kickName && actions ? actions[kickName] : null

    // Coup de pied
    if (source.kickRequested) {
      source.kickRequested = false
      if (!frozen && kickAction) {
        if (runAction) { runAction.fadeOut(0.1); running.current = false }
        kickAction.reset()
        kickAction.setLoop(THREE.LoopOnce, 1)
        kickAction.clampWhenFinished = true
        kickAction.timeScale = KICK_SPEED
        kickAction.fadeIn(0.05).play()
        kicking.current = true
        kickEnd.current = now + kickAction.getClip().duration / KICK_SPEED
      }
      // Propulser le ballon s'il est à portée
      if (!frozen) {
        const ball = ballStore.body
        const p = body.current.translation()
        if (ball) {
          const bt = ball.translation()
          const dx = bt.x - p.x
          const dz = bt.z - p.z
          const d = Math.hypot(dx, dz)
          if (d < KICK_RANGE) {
            ball.applyImpulse({ x: (dx / (d || 1)) * KICK_POWER, y: KICK_UP, z: (dz / (d || 1)) * KICK_POWER }, true)
          }
        }
      }
    }

    if (kicking.current && now >= kickEnd.current) {
      if (kickAction) kickAction.fadeOut(0.15)
      kicking.current = false
    }

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

    if (reportPos) {
      const p = body.current.translation()
      playerPos.x = p.x
      playerPos.y = p.y
      playerPos.z = p.z
    }
  })

  return (
    <RigidBody ref={body} colliders={false} mass={1} lockRotations position={spawn}>
      <CuboidCollider args={[0.5, 0.5, 0.5]} />
      {/* Marqueur d'équipe au sol */}
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.78, 28]} />
        <meshBasicMaterial color={markerColor} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <group ref={visual}>
        <primitive object={model} scale={MODEL_SCALE} position={[0, groundY, 0]} />
      </group>
    </RigidBody>
  )
}

useGLTF.preload(MODEL_URL)
