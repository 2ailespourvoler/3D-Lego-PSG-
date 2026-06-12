// Données partagées du jeu.

// Position du joueur, mise à jour à chaque image par Player.jsx,
// et lue par les pièces pour détecter le ramassage.
export const playerPos = { x: 0, y: 0, z: 0 };

// Renvoie une position aléatoire sur le sol, en évitant le centre (où démarre le joueur).
export function randomCoinPos(half = 18) {
  let x, z;
  do {
    x = (Math.random() * 2 - 1) * half;
    z = (Math.random() * 2 - 1) * half;
  } while (Math.abs(x) < 2 && Math.abs(z) < 2);
  return [x, z];
}
