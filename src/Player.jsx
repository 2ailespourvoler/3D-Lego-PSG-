import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { input } from './input';
import { playerPos } from './game';

const SPEED = 5;

// --- Réglages du modèle ---
const MODEL_URL = '/personnage.glb';
const MODEL_SCALE = 0.7;
const MODEL_FACING = 0; // si besoin : Math.PI, Math.PI / 2, ou -Math.PI / 2
// --------------------------

export default function Player() {
  const body = useRef(null);
  const visual = useRef(null);
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }, [scene]);

  const groundY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    return -0.5 - MODEL_SCALE * box.min.y;
  }, [scene]);

  const move = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camDesired = new THREE.Vector3();
  const camOffset = new THREE.Vector3(0, 6, 10);

  useFrame((state, delta) => {
    if (!body.current) return;

    move.set(input.x, 0, input.z);
    if (move.lengthSq() > 1) move.normalize();

    const vel = body.current.linvel();
    body.current.setLinvel(
      { x: move.x * SPEED, y: vel.y, z: move.z * SPEED },
      true
    );

    if (visual.current && move.lengthSq() > 0.0001) {
      const targetAngle = Math.atan2(move.x, move.z) + MODEL_FACING;
      const cur = visual.current.rotation.y;
      let diff = targetAngle - cur;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      visual.current.rotation.y = cur + diff * (1 - Math.pow(0.0001, delta));
    }

    const pos = body.current.translation();

    // Partager la position du joueur (utilisée par les pièces)
    playerPos.x = pos.x;
    playerPos.y = pos.y;
    playerPos.z = pos.z;

    camTarget.set(pos.x, pos.y, pos.z);
    camDesired.copy(camTarget).add(camOffset);
    const smooth = 1 - Math.pow(0.001, delta);
    state.camera.position.lerp(camDesired, smooth);
    state.camera.lookAt(camTarget);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={1}
      lockRotations
      position={[0, 1, 0]}
    >
      <CuboidCollider args={[0.5, 0.5, 0.5]} />
      <group ref={visual}>
        <primitive
          object={scene}
          scale={MODEL_SCALE}
          position={[0, groundY, 0]}
        />
      </group>
    </RigidBody>
  );
}

useGLTF.preload(MODEL_URL);
