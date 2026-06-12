import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import Player from './Player'
import Joystick from './Joystick'
import Coins from './Coins'
import Stadium from './Stadium'
import Ball from './Ball'

const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

const TOTAL_COINS = 8   // mode "tout ramasser"
const TIMED_COINS = 5   // pièces simultanées en mode chrono
const TIME_LIMIT = 30   // secondes (mode temps limité)

export default function App() {
  const [phase, setPhase] = useState('menu')   // 'menu' | 'playing' | 'over'
  const [mode, setMode] = useState('collect')  // 'collect' | 'timed'
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(0)
  const startRef = useRef(0)
  const scoreRef = useRef(0)

  function startGame(selectedMode) {
    setMode(selectedMode)
    setScore(0)
    scoreRef.current = 0
    startRef.current = performance.now()
    setTime(selectedMode === 'timed' ? TIME_LIMIT : 0)
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      const elapsed = (performance.now() - startRef.current) / 1000
      if (mode === 'timed') {
        const remaining = Math.max(0, TIME_LIMIT - elapsed)
        setTime(remaining)
        if (remaining <= 0) setPhase('over')
      } else {
        setTime(elapsed)
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase, mode])

  function handleCollect() {
    scoreRef.current += 1
    setScore(scoreRef.current)
    if (mode === 'collect' && scoreRef.current >= TOTAL_COINS) {
      setPhase('over')
    }
  }

  const coinsKey = `${mode}-${startRef.current}`

  return (
    <>
      <Canvas shadows camera={{ position: [0, 6, 10], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 12, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />

        <Physics>
          {/* Sol de base (sous le terrain) */}
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[0, -0.5, 0]} receiveShadow>
              <boxGeometry args={[70, 1, 60]} />
              <meshStandardMaterial color="#2d6a35" />
            </mesh>
          </RigidBody>

          {/* Le stade : terrain, lignes, gradins, public, murs */}
          <Stadium />

          {/* Le ballon : le joueur le pousse en le percutant */}
          <Ball key={`ball-${startRef.current}`} />

          <Suspense fallback={null}>
            <Player key={`player-${startRef.current}`} />
          </Suspense>

          {phase === 'playing' && (
            <Coins
              key={coinsKey}
              count={mode === 'timed' ? TIMED_COINS : TOTAL_COINS}
              mode={mode}
              onCollect={handleCollect}
            />
          )}
        </Physics>
      </Canvas>

      {isTouch && <Joystick />}

      {phase === 'playing' && (
        <div className="hud">
          <div className="hud-pill">🪙 {score}{mode === 'collect' ? ` / ${TOTAL_COINS}` : ''}</div>
          <div className="hud-pill">⏱️ {time.toFixed(1)}s</div>
        </div>
      )}

      {phase === 'menu' && (
        <div className="overlay">
          <div className="panel">
            <h1>Ramasse les pièces !</h1>
            <button onClick={() => startGame('collect')}>
              🎯 Toutes les pièces, le plus vite possible
            </button>
            <button onClick={() => startGame('timed')}>
              ⏱️ Un maximum en {TIME_LIMIT} secondes
            </button>
          </div>
        </div>
      )}

      {phase === 'over' && (
        <div className="overlay">
          <div className="panel">
            <h1>{mode === 'collect' ? 'Gagné ! 🎉' : 'Temps écoulé !'}</h1>
            <p className="result">
              {mode === 'collect'
                ? `Ton temps : ${time.toFixed(1)}s`
                : `Pièces ramassées : ${score}`}
            </p>
            <button onClick={() => setPhase('menu')}>Rejouer</button>
          </div>
        </div>
      )}
    </>
  )
}
