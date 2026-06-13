import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGLTF, useAnimations } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { ballStore, GOAL } from './game'

const KEEPER_SPEED = 4.5          // vitesse latérale (un peu plus lente qu'un joueur -> battable)
const KEEPER_LINE_INSET = 0.3     // distance devant la ligne de but
const KEEPER_Z_LIMIT = GOAL.width / 2 - 0.7  // reste entre les poteaux
const LEAD = 0.12                 // anticipation sur la trajectoire du ballon
const ANIM_SPEED = 1.2
const BODY_Y = 0.5

export default function Goalkeeper({
  modelUrl = '/personnage.glb',
  modelScale = 0.7,
  modelFacing = 0,
  side = 1,                       // +1 = but +x, -1 = but -x
  markerColor = '#e8412c',
  frozen = false,
}) {
  const body = useRef(null)
  const visual = useRef(null)
  const running = useRef(false)
  const curZ = useRef(0)

  const { scene, animations } = useGLTF(modelUrl)
  const model = useMemo(() => cloneSkeleton(scene), [scene])
  const { actions, names } = useAnimations(animations, visual)

  const runName = useMemo(() => {
    if (!names || names.length === 0) return null
    return names.find((n) => /run|cours|sprint|jog|walk|march/i.test(n)) || names[0]
  }, [names])

  useEffect(() => {
    model.traverse((o) => { if (o.isMesh) o.castShadow = true })
  }, [model])

  const groundY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    return -0.5 - modelScale * box.min.y
  }, [scene, modelScale])

  const keeperX = side * (GOAL.lineX - KEEPER_LINE_INSET)

  // Le gardien regarde toujours vers le terrain (centre)
  const faceAngle = Math.atan2(-side, 0) + modelFacing

  useEffect(() => {
    if (visual.current) visual.current.rotation.y = faceAngle
    curZ.current = 0
    if (body.current) body.current.setNextKinematicTranslation({ x: keeperX, y: BODY_Y, z: 0 })
  }, [faceAngle, keeperX])

  useFrame((_, delta) => {
    if (!body.current) return

    // --- IA : cible en z ---
    let targetZ = 0
    const ball = ballStore.body
    if (ball) {
      const t = ball.translation()
      const v = ball.linvel()
      // n'intervient que si le ballon est dans sa moitié de terrain, sinon se recentre
      const onMySide = side > 0 ? t.x > -3 : t.x < 3
      if (onMySide) targetZ = t.z + v.z * LEAD
      else targetZ = 0
    }
    targetZ = THREE.MathUtils.clamp(targetZ, -KEEPER_Z_LIMIT, KEEPER_Z_LIMIT)

    // --- déplacement à vitesse limitée (verrouillé sur la ligne) ---
    let dz = 0
    if (!frozen) {
      const maxStep = KEEPER_SPEED * delta
      dz = THREE.MathUtils.clamp(targetZ - curZ.current, -maxStep, maxStep)
      curZ.current += dz
    }
    body.current.setNextKinematicTranslation({ x: keeperX, y: BODY_Y, z: curZ.current })

    // --- animation course quand il bouge ---
    const speed = Math.abs(dz) / Math.max(delta, 0.0001)
    const moving = !frozen && speed > 0.4
    const runAction = runName && actions ? actions[runName] : null
    if (runAction) {
      runAction.timeScale = ANIM_SPEED
      if (moving && !running.current) {
        runAction.reset().fadeIn(0.2).play()
        running.current = true
      } else if (!moving && running.current) {
        runAction.fadeOut(0.2)
        running.current = false
      }
    }
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[keeperX, BODY_Y, 0]}
    >
      <CuboidCollider args={[0.45, 0.6, 0.55]} restitution={0.5} />
      {/* Marqueur d'équipe au sol */}
      <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.78, 28]} />
        <meshBasicMaterial color={markerColor} side={THREE.DoubleSide} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <group ref={visual}>
        <primitive object={model} scale={modelScale} position={[0, groundY, 0]} />
      </group>
    </RigidBody>
  )
}
