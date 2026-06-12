// Données partagées du jeu.

// Dimensions du terrain (demi-longueur hx sur l'axe X, demi-largeur hz sur l'axe Z).
export const PITCH = { hx: 22, hz: 15 }

// Position du joueur, mise à jour à chaque image par Player.jsx,
// et lue par les pièces pour détecter le ramassage.
export const playerPos = { x: 0, y: 0, z: 0 }

// Position aléatoire d'une pièce, à l'intérieur du terrain, en évitant le centre.
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
