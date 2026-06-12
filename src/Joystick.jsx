import { useRef } from 'react';
import { input } from './input';

const RADIUS = 50; // rayon maximal du joystick, en pixels

export default function Joystick() {
  const knob = useRef(null);
  const origin = useRef({ x: 0, y: 0 });
  const active = useRef(false);

  const start = (e) => {
    active.current = true;
    const t = e.touches[0];
    origin.current = { x: t.clientX, y: t.clientY };
  };

  const move = (e) => {
    if (!active.current) return;
    const t = e.touches[0];
    let dx = t.clientX - origin.current.x;
    let dy = t.clientY - origin.current.y;

    // Limiter le déplacement du pouce au rayon du joystick
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    if (knob.current) {
      knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // Écrire dans l'entrée partagée (valeurs entre -1 et 1)
    input.x = dx / RADIUS;
    input.z = dy / RADIUS;
  };

  const end = () => {
    active.current = false;
    if (knob.current) knob.current.style.transform = 'translate(0, 0)';
    input.x = 0;
    input.z = 0;
  };

  return (
    <div
      className="joystick"
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  );
}
