// Entrées : clavier, joystick tactile, manette. + coup de pied (bouton A / Espace).
export const input = { x: 0, z: 0, kickRequested: false }

const keys = {}
const DEADZONE = 0.2

function updateFromKeyboard() {
  let x = 0
  let z = 0
  if (keys['ArrowUp'] || keys['KeyW'] || keys['KeyZ']) z -= 1
  if (keys['ArrowDown'] || keys['KeyS']) z += 1
  if (keys['ArrowLeft'] || keys['KeyA'] || keys['KeyQ']) x -= 1
  if (keys['ArrowRight'] || keys['KeyD']) x += 1
  input.x = x
  input.z = z
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true
    if (e.code === 'Space' && !e.repeat) input.kickRequested = true // coup de pied au clavier
    updateFromKeyboard()
  })
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false
    updateFromKeyboard()
  })

  // --- Manette ---
  let padWasActive = false
  let kickWas = false
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    let active = false
    for (const pad of pads) {
      if (!pad) continue
      const gx = pad.axes[0] || 0
      const gz = pad.axes[1] || 0
      if (Math.abs(gx) > DEADZONE || Math.abs(gz) > DEADZONE) {
        input.x = gx
        input.z = gz
        active = true
      }
      // Bouton A (index 0) = coup de pied, déclenché à l'appui
      const kick = !!(pad.buttons[0] && pad.buttons[0].pressed)
      if (kick && !kickWas) input.kickRequested = true
      kickWas = kick
      break
    }
    if (!active && padWasActive) updateFromKeyboard()
    padWasActive = active
    requestAnimationFrame(pollGamepad)
  }
  requestAnimationFrame(pollGamepad)
}
