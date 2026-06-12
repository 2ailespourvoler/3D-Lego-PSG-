// Données partagées du jeu.

export const PITCH = { hx: 22, hz: 15 }

export const playerPos = { x: 0, y: 0, z: 0 }

// Référence vers le corps physique du ballon (pour le frapper depuis le joueur).
export const ballStore = { body: null }

export function randomCoinPos() {
  const mx = PITCH.hx - 3
  const mz = PITCH.hz - 3
  let x, z
  do {
    x = (Math.random() * 2 - 1) * mx
    z = (Math.random() * 2 - 1) * mz
  } while (Math.abs(x) < 2 && Math.abs(z) < 2)
  return [x, z]
}
