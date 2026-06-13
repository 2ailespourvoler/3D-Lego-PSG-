// Sons synthétisés via la Web Audio API (aucun fichier externe nécessaire).
let ctx = null

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// À appeler sur un clic (menu) pour "débloquer" l'audio dans le navigateur
export function primeAudio() {
  getCtx()
}

// "Pock" de frappe dans le ballon
export function playKick() {
  const c = getCtx()
  if (!c) return
  const t = c.currentTime

  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(170, t)
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.12)
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.2)

  // petit "clac" (bruit court)
  const n = Math.floor(c.sampleRate * 0.05)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = c.createBufferSource()
  src.buffer = buf
  const ng = c.createGain()
  ng.gain.value = 0.25
  src.connect(ng).connect(c.destination)
  src.start(t)
}

// Clameur de foule (montée de bruit filtré) lors d'un but
export function playCheer() {
  const c = getCtx()
  if (!c) return
  const t = c.currentTime
  const dur = 1.9

  const n = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf

  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 900
  bp.Q.value = 0.6

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.55, t + 0.3)   // montée
  gain.gain.linearRampToValueAtTime(0.4, t + dur * 0.6)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur) // descente

  src.connect(bp).connect(gain).connect(c.destination)
  src.start(t)
  src.stop(t + dur)
}
