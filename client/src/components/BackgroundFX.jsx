import React, { useEffect, useRef } from 'react';

// Lightweight animated starfield + parallax nebula
export default function BackgroundFX({ intensity = 1 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    const count = Math.min(300 * intensity, 800);
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.6 + 0.4,
      r: Math.random() * 1.5 + 0.2,
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // soft vignette
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h));
      grad.addColorStop(0, 'rgba(10,12,16,0.6)');
      grad.addColorStop(1, 'rgba(10,12,16,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,w,h);

      // Nebula glows
      const blobs = [
        { x: w*0.25, y: h*0.35, r: 280, c: 'rgba(99,102,241,0.10)' },
        { x: w*0.7, y: h*0.6, r: 360, c: 'rgba(56,189,248,0.10)' },
        { x: w*0.55, y: h*0.25, r: 220, c: 'rgba(192,132,252,0.10)' },
      ];
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      stars.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -10) s.x = w+10; if (s.x > w+10) s.x = -10;
        if (s.y < -10) s.y = h+10; if (s.y > h+10) s.y = -10;
        const r = s.r * (s.z);
        ctx.fillStyle = `rgba(180,200,255,${0.5 + 0.5*Math.sin((s.x+s.y)*0.005)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize); };
  }, [intensity]);

  return (
    <div style={{position:'absolute', inset:0, overflow:'hidden', zIndex:0}} aria-hidden>
      <canvas ref={canvasRef} style={{width:'100%', height:'100%'}} />
    </div>
  );
}
