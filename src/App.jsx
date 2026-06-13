import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Player from './Player'
import Goalkeeper from './Goalkeeper'
import Ball from './Ball'
import Stadium from './Stadium'
import CharacterSelect from './CharacterSelect'
import { CHARACTERS } from './characters'
import { input1, input2, aiInput } from './input'
import { playerPos, playerPos2, ballStore, GOAL, PITCH } from './game'
import { playCheer, primeAudio } from './sound'

const MATCH_TIME = 120

// Précharger tous les personnages
CHARACTERS.forEach((c) => useGLTF.preload(c.url))
const charById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]

const SOLO_OFFSET = new THREE.Vector3(0, 6, 10)

function CameraRig({ mode }) {
  const desired = useRef(new THREE.Vector3(0, 31, 33))
  const lookTarget = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  useFrame((state, delta) => {
    if (mode === 'solo') {
      lookTarget.current.set(playerPos.x, 0, playerPos.z)
      desired.current.copy(lookTarget.current).add(SOLO_OFFSET)
    } else {
      // Suit le milieu des deux joueurs, et dézoome quand ils s'éloignent
      const midX = (playerPos.x + playerPos2.x) / 2
      const midZ = (playerPos.z + playerPos2.z) / 2
      const spread = Math.hypot(playerPos.x - playerPos2.x, playerPos.z - playerPos2.z)
      const height = THREE.MathUtils.clamp(8 + spread * 0.55, 10, 28)
      const back = THREE.MathUtils.clamp(9 + spread * 0.5, 11, 24)
      lookTarget.current.set(midX, 1, midZ)
      desired.current.set(midX, height, midZ + back)
    }
    const s = 1 - Math.pow(0.0015, delta)
    state.camera.position.lerp(desired.current, s)
    look.current.lerp(lookTarget.current, s)
    state.camera.lookAt(look.current)
  })
  return null
}

function GoalSensor({ active, onGoal }) {
  const last = useRef(0)
  useFrame(() => {
    if (!active) return
    const ball = ballStore.body
    if (!ball) return
    const now = performance.now()
    if (now - last.current < 2000) return
    const t = ball.translation()
    if (Math.abs(t.z) < GOAL.width / 2 - 0.2 && t.y < 2.3) {
      if (t.x > GOAL.lineX + 0.2) { last.current = now; onGoal(1) }
      else if (t.x < -GOAL.lineX - 0.2) { last.current = now; onGoal(2) }
    }
  })
  return null
}

// Replace le ballon au centre s'il sort du terrain (tribunes, etc.)
function BallWatcher({ active }) {
  useFrame(() => {
    if (!active) return
    const ball = ballStore.body
    if (!ball) return
    const t = ball.translation()
    if (Math.abs(t.x) > PITCH.hx + 2.5 || Math.abs(t.z) > PITCH.hz + 2.5 || t.y < -2 || t.y > 9) {
      ball.setTranslation({ x: 0, y: 0.3, z: 0 }, true)
      ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
      ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  })
  return null
}

// IA de champ : court derrière le ballon et le pousse vers le but adverse (-x)
function AIController({ active }) {
  const last = useRef(0)
  useFrame(() => {
    if (!active) { aiInput.x = 0; aiInput.z = 0; return }
    const ball = ballStore.body
    if (!ball) return
    const b = ball.translation()
    const self = playerPos2
    const goalX = -GOAL.lineX
    const gdx = goalX - b.x
    const gdz = 0 - b.z
    const gl = Math.hypot(gdx, gdz) || 1
    const ux = gdx / gl, uz = gdz / gl
    // point d'approche : derrière le ballon, côté opposé au but visé
    const apx = b.x - ux * 0.85
    const apz = b.z - uz * 0.85
    const mx = apx - self.x, mz = apz - self.z
    const md = Math.hypot(mx, mz) || 1
    aiInput.x = mx / md
    aiInput.z = mz / md
    // frappe si proche du ballon et bien aligné vers le but
    const bdx = b.x - self.x, bdz = b.z - self.z
    const bd = Math.hypot(bdx, bdz)
    const align = (bdx / (bd || 1)) * ux + (bdz / (bd || 1)) * uz
    const now = performance.now()
    if (bd < 1.5 && align > 0.3 && now - last.current > 500) {
      aiInput.kickRequested = true
      last.current = now
    }
  })
  return null
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function App() {
  const [mode, setMode] = useState('duel')
  const [opp, setOpp] = useState('friend')        // 'friend' | 'ai' (duel uniquement)
  const [phase, setPhase] = useState('menu')      // 'menu' | 'select' | 'playing' | 'over'
  const [selectStep, setSelectStep] = useState('p1')
  const [pick1, setPick1] = useState(CHARACTERS[0].id)
  const [pick2, setPick2] = useState(CHARACTERS[0].id)
  const [keeper1, setKeeper1] = useState(CHARACTERS[0].id)
  const [keeper2, setKeeper2] = useState(CHARACTERS[0].id)
  const [s1, setS1] = useState(0)
  const [s2, setS2] = useState(0)
  const [time, setTime] = useState(MATCH_TIME)
  const [goalBy, setGoalBy] = useState(null)
  const [token, setToken] = useState(0)

  const r1 = useRef(0)
  const r2 = useRef(0)
  const goalTimer = useRef(null)

  function chooseMode(m, opponent = 'friend') {
    primeAudio()
    setMode(m)
    setOpp(opponent)
    setSelectStep('p1')
    setPhase('select')
  }

  function startMatch() {
    setS1(0); setS2(0); r1.current = 0; r2.current = 0
    setTime(MATCH_TIME)
    setGoalBy(null)
    setToken((t) => t + 1)
    setPhase('playing')
  }

  function handlePick(id) {
    if (selectStep === 'p1') {
      setPick1(id); setSelectStep('g1')
    } else if (selectStep === 'g1') {
      setKeeper1(id)
      if (mode === 'duel') setSelectStep('p2')
      else startMatch()
    } else if (selectStep === 'p2') {
      setPick2(id); setSelectStep('g2')
    } else {
      setKeeper2(id); startMatch()
    }
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => {
      setTime((prev) => {
        if (goalBy !== null) return prev
        const next = prev - 0.1
        if (next <= 0) { setPhase('over'); return 0 }
        return next
      })
    }, 100)
    return () => clearInterval(id)
  }, [phase, goalBy])

  function handleGoal(team) {
    if (team === 1) { r1.current += 1; setS1(r1.current) }
    else { r2.current += 1; setS2(r2.current) }
    playCheer()
    setGoalBy(team)
    setToken((t) => t + 1)
    if (goalTimer.current) clearTimeout(goalTimer.current)
    goalTimer.current = setTimeout(() => setGoalBy(null), 1800)
  }

  useEffect(() => () => { if (goalTimer.current) clearTimeout(goalTimer.current) }, [])

  const frozen = goalBy !== null
  const half = PITCH.hx * 0.4
  const c1 = charById(pick1)
  const c2 = charById(pick2)
  const gk1 = charById(keeper1)
  const gk2 = charById(keeper2)

  return (
    <>
      <Canvas shadows camera={{ position: [0, 31, 33], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 14, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />

        <CameraRig mode={phase === 'playing' ? mode : 'duel'} />

        <Physics>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[0, -0.5, 0]} receiveShadow>
              <boxGeometry args={[70, 1, 60]} />
              <meshStandardMaterial color="#2d6a35" />
            </mesh>
          </RigidBody>

          <Stadium />

          {phase === 'playing' && (
            <>
              <Ball key={`ball-${token}`} />

              <Suspense fallback={null}>
                <Player
                  key={`p1-${token}`}
                  source={input1}
                  modelUrl={c1.url}
                  modelScale={c1.scale}
                  modelFacing={c1.facing}
                  spawn={mode === 'solo' ? [-2.5, 1, 0] : [-half, 1, 0]}
                  markerColor="#2b6cff"
                  posTarget={playerPos}
                  frozen={frozen}
                />
              </Suspense>

              {mode === 'duel' && (
                <Suspense fallback={null}>
                  <Player
                    key={`p2-${token}`}
                    source={opp === 'ai' ? aiInput : input2}
                    modelUrl={c2.url}
                    modelScale={c2.scale}
                    modelFacing={c2.facing}
                    spawn={[half, 1, 0]}
                    markerColor="#e8412c"
                    posTarget={playerPos2}
                    frozen={frozen}
                  />
                </Suspense>
              )}

              {mode === 'duel' && opp === 'ai' && (
                <AIController active={!frozen} />
              )}

              {/* Gardiens (IA, verrouillés sur leur ligne) */}
              {mode === 'duel' ? (
                <>
                  <Suspense fallback={null}>
                    <Goalkeeper
                      key={`gk1-${token}`}
                      modelUrl={gk1.url}
                      modelScale={gk1.scale}
                      modelFacing={gk1.facing}
                      side={-1}
                      markerColor="#2b6cff"
                      frozen={frozen}
                    />
                  </Suspense>
                  <Suspense fallback={null}>
                    <Goalkeeper
                      key={`gk2-${token}`}
                      modelUrl={gk2.url}
                      modelScale={gk2.scale}
                      modelFacing={gk2.facing}
                      side={1}
                      markerColor="#e8412c"
                      frozen={frozen}
                    />
                  </Suspense>
                </>
              ) : (
                <Suspense fallback={null}>
                  <Goalkeeper
                    key={`gk1-${token}`}
                    modelUrl={gk1.url}
                    modelScale={gk1.scale}
                    modelFacing={gk1.facing}
                    side={1}
                    markerColor="#e8412c"
                    frozen={frozen}
                  />
                </Suspense>
              )}

              <GoalSensor active={!frozen} onGoal={handleGoal} />
              <BallWatcher active={!frozen} />
            </>
          )}
        </Physics>
      </Canvas>

      {phase === 'playing' && (
        <div className="hud">
          {mode === 'duel' ? (
            <div className="hud-pill score">
              <span className="t1">Bleu</span> {s1} <span className="sep">-</span> {s2} <span className="t2">{opp === 'ai' ? 'IA' : 'Rouge'}</span>
            </div>
          ) : (
            <div className="hud-pill">⚽ Buts : {s1}</div>
          )}
          <div className="hud-pill">⏱️ {fmt(time)}</div>
        </div>
      )}

      {phase === 'playing' && goalBy && (
        <div className="goal-flash">
          <div className={goalBy === 1 ? 'goal-text t1' : 'goal-text t2'}>BUT !</div>
        </div>
      )}

      {phase === 'menu' && (
        <div className="overlay">
          <div className="panel">
            <h1>⚽ Foot Lego</h1>
            <button onClick={() => chooseMode('solo')}>Solo (entraînement)</button>
            <button onClick={() => chooseMode('duel', 'friend')}>Duel — contre un ami</button>
            <button onClick={() => chooseMode('duel', 'ai')}>Duel — contre l'IA</button>
            <p className="hint-controls">
              J1 : flèches + Entrée (ou manette + A)<br />
              J2 : ZQSD/WASD + Espace
            </p>
          </div>
        </div>
      )}

      {phase === 'select' && (
        <CharacterSelect
          title={
            selectStep === 'p1'
              ? (mode === 'duel' ? 'Joueur Bleu : choisis ton joueur' : 'Choisis ton joueur')
              : selectStep === 'g1'
              ? (mode === 'duel' ? 'Joueur Bleu : choisis ton gardien' : 'Choisis ton gardien')
              : selectStep === 'p2'
              ? (opp === 'ai' ? 'Adversaire IA : choisis son joueur' : 'Joueur Rouge : choisis ton joueur')
              : (opp === 'ai' ? 'Adversaire IA : choisis son gardien' : 'Joueur Rouge : choisis ton gardien')
          }
          color={selectStep === 'p1' || selectStep === 'g1' ? '#5b9bff' : '#ff6a55'}
          onPick={handlePick}
        />
      )}

      {phase === 'over' && (
        <div className="overlay">
          <div className="panel">
            {mode === 'duel' ? (
              <>
                <h1>{s1 > s2 ? 'Joueur Bleu gagne ! 🎉' : s2 > s1 ? (opp === 'ai' ? "L'IA gagne ! 🤖" : 'Joueur Rouge gagne ! 🎉') : 'Match nul'}</h1>
                <p className="result">{s1} - {s2}</p>
              </>
            ) : (
              <>
                <h1>Fin du match</h1>
                <p className="result">Tu as marqué {s1} but{s1 > 1 ? 's' : ''} !</p>
              </>
            )}
            <button onClick={() => setPhase('menu')}>Rejouer</button>
          </div>
        </div>
      )}
    </>
  )
}
