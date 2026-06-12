// Deux jeux d'entrées : joueur 1 (flèches + manette) et joueur 2 (ZQSD/WASD).
export const input1 = { x: 0, z: 0, kickRequested: false } // J1 : flèches + manette, frappe = Entrée / bouton A
export const input2 = { x: 0, z: 0, kickRequested: false } // J2 : ZQSD/WASD, frappe = Espace

const keys = {}
const DEADZONE = 0.2

function updateKeyboard() {
  // Joueur 1 : flèches
  let x1 = 0, z1 = 0
  if (keys['ArrowUp']) z1 -= 1
  if (keys['ArrowDown']) z1 += 1
  if (keys['ArrowLeft']) x1 -= 1
  if (keys['ArrowRight']) x1 += 1
  input1.x = x1
  input1.z = z1

  // Joueur 2 : ZQSD (AZERTY) / WASD (QWERTY)
  let x2 = 0, z2 = 0
  if (keys['KeyW'] || keys['KeyZ']) z2 -= 1
  if (keys['KeyS']) z2 += 1
  if (keys['KeyA'] || keys['KeyQ']) x2 -= 1
  if (keys['KeyD']) x2 += 1
  input2.x = x2
  input2.z = z2
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true
    if (e.code === 'Enter' && !e.repeat) input1.kickRequested = true   // frappe J1
    if (e.code === 'Space' && !e.repeat) input2.kickRequested = true   // frappe J2
    updateKeyboard()
  })
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false
    updateKeyboard()
  })

  // --- Manette (joueur 1) ---
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
        input1.x = gx
        input1.z = gz
        active = true
      }
      const kick = !!(pad.buttons[0] && pad.buttons[0].pressed) // bouton A
      if (kick && !kickWas) input1.kickRequested = true
      kickWas = kick
      break
    }
    if (!active && padWasActive) updateKeyboard()
    padWasActive = active
    requestAnimationFrame(pollGamepad)
  }
  requestAnimationFrame(pollGamepad)
}
