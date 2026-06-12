// Entrées de déplacement : clavier, joystick tactile ET manette (Xbox, etc.).
export const input = { x: 0, z: 0 };

const keys = {};
const DEADZONE = 0.2; // zone morte du stick, pour ignorer les micro-mouvements

function updateFromKeyboard() {
  let x = 0;
  let z = 0;
  if (keys['ArrowUp'] || keys['KeyW'] || keys['KeyZ']) z -= 1; // avancer
  if (keys['ArrowDown'] || keys['KeyS']) z += 1; // reculer
  if (keys['ArrowLeft'] || keys['KeyA'] || keys['KeyQ']) x -= 1; // gauche
  if (keys['ArrowRight'] || keys['KeyD']) x += 1; // droite
  input.x = x;
  input.z = z;
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    updateFromKeyboard();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    updateFromKeyboard();
  });

  // --- Manette de jeu (API Gamepad) : on lit le stick gauche ---
  let padWasActive = false;
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let active = false;
    for (const pad of pads) {
      if (!pad) continue;
      const gx = pad.axes[0] || 0; // stick gauche, horizontal
      const gz = pad.axes[1] || 0; // stick gauche, vertical
      if (Math.abs(gx) > DEADZONE || Math.abs(gz) > DEADZONE) {
        input.x = gx;
        input.z = gz;
        active = true;
      }
      break; // on n'utilise que la première manette branchée
    }
    // Quand on relâche le stick, on rend la main au clavier
    if (!active && padWasActive) updateFromKeyboard();
    padWasActive = active;
    requestAnimationFrame(pollGamepad);
  }
  requestAnimationFrame(pollGamepad);
}
