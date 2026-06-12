// Données partagées du jeu.

export const PITCH = { hx: 22, hz: 15 }

// Ligne de but (alignée sur la texture du terrain) + dimensions de la cage
export const GOAL = {
  lineX: PITCH.hx - (28 / 1024) * (PITCH.hx * 2),
  width: 7,
  height: 2.4,
}

// Position du joueur 1 (suivi caméra en mode Solo)
export const playerPos = { x: 0, y: 0, z: 0 }

// Corps physique du ballon (pour le frapper)
export const ballStore = { body: null }
