import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { playerPos, randomCoinPos } from './game';

const PICKUP_R = 1.1; // distance de ramassage

function Coin({ start, mode, onCollect }) {
  const [pos, setPos] = useState(start); // [x, z]
  const [collected, setCollected] = useState(false);
  const ref = useRef(null);
  const wasInside = useRef(false);

  useFrame((_, delta) => {
    if (collected) return;

    // Animation : la pièce tourne et flotte légèrement
    if (ref.current) {
      ref.current.rotation.y += delta * 2;
      ref.current.position.y = 0.6 + Math.sin(performance.now() / 300) * 0.12;
    }

    // Détection du ramassage (sur le plan du sol, on ignore la hauteur)
    const dx = playerPos.x - pos[0];
    const dz = playerPos.z - pos[1];
    const inside = dx * dx + dz * dz < PICKUP_R * PICKUP_R;

    if (inside && !wasInside.current) {
      onCollect();
      if (mode === 'timed') {
        setPos(randomCoinPos()); // réapparait ailleurs
      } else {
        setCollected(true); // disparait
      }
    }
    wasInside.current = inside;
  });

  if (collected) return null;

  return (
    <group ref={ref} position={[pos[0], 0.6, pos[1]]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.1, 24]} />
        <meshStandardMaterial color="#ffd23f" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function Coins({ count, mode, onCollect }) {
  // Positions de départ tirées une seule fois au montage
  const [starts] = useState(() =>
    Array.from({ length: count }, () => randomCoinPos())
  );
  return (
    <>
      {starts.map((s, i) => (
        <Coin key={i} start={s} mode={mode} onCollect={onCollect} />
      ))}
    </>
  );
}
