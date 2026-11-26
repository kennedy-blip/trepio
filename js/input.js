/* =====================================================================
   input.js — keyboard + touch joystick + camera drag / pinch / wheel
   ===================================================================== */
export function createInput(canvas) {
  const keys = new Set();
  const joy = { active: false, id: null, x: 0, y: 0 };
  let jumpQueued = false;
  const dragHandlers = [];
  const zoomHandlers = [];

  const joyEl = document.getElementById('joy');
  const knobEl = document.getElementById('joyKnob');

  /* ---------- keyboard ---------- */
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Space') jumpQueued = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  /* ---------- camera drag / pinch on the canvas ---------- */
  const camPointers = new Map();
  let lastPinchDist = 0;
  canvas.addEventListener('pointerdown', (e) => {
    camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = camPointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (camPointers.size === 1) {
      for (const h of dragHandlers) h(dx, dy);
    } else if (camPointers.size === 2) {
      const pts = [...camPointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist > 0) {
        for (const h of zoomHandlers) h((lastPinchDist - dist) * 0.03);
      }
      lastPinchDist = dist;
    }
  });
  const endPointer = (e) => {
    camPointers.delete(e.pointerId);
    if (camPointers.size < 2) lastPinchDist = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    for (const h of zoomHandlers) h(e.deltaY * 0.004);
  }, { passive: false });

  /* ---------- touch joystick ---------- */
  if (joyEl) {
    const R = 46;
    const setKnob = (x, y) => {
      if (knobEl) knobEl.style.transform = `translate(${x}px, ${y}px)`;
    };
    joyEl.addEventListener('pointerdown', (e) => {
      joy.active = true;
      joy.id = e.pointerId;
      joyEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    joyEl.addEventListener('pointermove', (e) => {
      if (!joy.active || e.pointerId !== joy.id) return;
      const rect = joyEl.getBoundingClientRect();
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(len, R);
      dx = (dx / len) * clamped;
      dy = (dy / len) * clamped;
      setKnob(dx, dy);
      joy.x = dx / R;
      joy.y = -dy / R;
    });
    const joyEnd = (e) => {
      if (e.pointerId !== joy.id) return;
      joy.active = false;
      joy.id = null;
      joy.x = 0;
      joy.y = 0;
      setKnob(0, 0);
    };
    joyEl.addEventListener('pointerup', joyEnd);
    joyEl.addEventListener('pointercancel', joyEnd);
  }

  return {
    keys,
    axis() {
      let x = 0, y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      x += joy.x;
      y += joy.y;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      return { x, y, len: Math.min(1, len) };
    },
    running() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    queueJump() { jumpQueued = true; },
    consumeJump() {
      const j = jumpQueued;
      jumpQueued = false;
      return j;
    },
    onDrag(h) { dragHandlers.push(h); },
    onZoom(h) { zoomHandlers.push(h); },
  };
}
