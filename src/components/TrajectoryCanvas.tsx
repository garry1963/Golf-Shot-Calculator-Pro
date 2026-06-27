import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface TrajectoryProps {
  carry: number;
  total: number;
  elevation: number;
  windSpeed: number;
  windAngle: number;
  shotType: string;
}

export default function TrajectoryCanvas({
  carry,
  total,
  elevation,
  windSpeed,
  windAngle,
  shotType,
}: TrajectoryProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(1); // 0 to 1 for flight animation
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Deconstruct wind to get its side-view horizontal component
  // windAngle 0 is headwind (slows ball / moves left in 2D side view)
  // windAngle 180 is tailwind (boosts ball / moves right in 2D side view)
  const angleRad = (windAngle * Math.PI) / 180;
  const headwindComponent = windSpeed * Math.cos(angleRad); // positive is headwind, negative tailwind

  // Approximate apex height based on shot type and loft
  let apexHeight = 35; // yards high on average
  if (shotType === 'Flop') apexHeight = 50;
  else if (shotType === 'Punch' || shotType === 'Knockdown') apexHeight = 18;
  else if (shotType === 'Chip') apexHeight = 8;
  else if (shotType === 'Pitch') apexHeight = 22;

  useEffect(() => {
    draw();
  }, [carry, total, elevation, windSpeed, windAngle, shotType, progress]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with a nice sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0a0f1d'); // Deep twilight midnight sky
    skyGrad.addColorStop(0.7, '#141e33');
    skyGrad.addColorStop(1, '#1a2c4c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Coordinates mapping
    // Start tee: x = 50, y = height - 40
    // Green target: x = width - 80, y = height - 40 - elevationOffset
    const startX = 50;
    const groundY = height - 40;
    
    // Scale yards to pixels
    const maxDistance = Math.max(300, total + 50);
    const scaleX = (width - 130) / maxDistance;
    const scaleY = (height - 100) / (apexHeight + Math.abs(elevation / 3) + 20);

    const targetX = startX + carry * scaleX;
    
    // Elevation (converted to yards: 3 ft = 1 yard)
    const elevYards = elevation / 3;
    const landingY = groundY - elevYards * scaleY;
    const totalX = startX + total * scaleX;

    // Draw Ground / Grass
    ctx.fillStyle = '#0f2c16'; // Deep emerald green
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, groundY);
    ctx.lineTo(startX, groundY);
    // Draw slope to landing
    ctx.lineTo(targetX, landingY);
    ctx.lineTo(width, landingY);
    ctx.lineTo(width, height);
    ctx.fill();

    // Draw Fairway / Tee area
    ctx.fillStyle = '#1b4d24'; // Lush fairway green
    ctx.beginPath();
    ctx.moveTo(startX - 20, groundY);
    ctx.lineTo(startX + 30, groundY);
    ctx.lineTo(startX + 30, groundY + 15);
    ctx.lineTo(startX - 20, groundY + 15);
    ctx.fill();

    // Draw Pin & Flag at landing point
    ctx.strokeStyle = '#f43f5e'; // Red flag
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetX, landingY);
    ctx.lineTo(targetX, landingY - 25);
    ctx.stroke();

    // Flag triangle
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(targetX, landingY - 25);
    ctx.lineTo(targetX + 10, landingY - 21);
    ctx.lineTo(targetX, landingY - 17);
    ctx.fill();

    // Draw Wind vectors (visual horizontal arrows floating in sky)
    ctx.strokeStyle = headwindComponent > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1.5;
    const windDir = headwindComponent > 0 ? -1 : 1; // headwind blows left, tailwind blows right
    const numArrows = 4;
    for (let i = 0; i < numArrows; i++) {
      const arrowX = 80 + i * (width / (numArrows + 0.5));
      const arrowY = 35 + (i % 2) * 20;
      
      // Draw arrow line
      if (windSpeed > 0) {
        ctx.beginPath();
        ctx.moveTo(arrowX - 15 * windDir, arrowY);
        ctx.lineTo(arrowX + 15 * windDir, arrowY);
        // Arrow head
        ctx.lineTo(arrowX + 10 * windDir, arrowY - 4);
        ctx.moveTo(arrowX + 15 * windDir, arrowY);
        ctx.lineTo(arrowX + 10 * windDir, arrowY + 4);
        ctx.stroke();
      }
    }

    // Write Wind Speed Text in sky
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px monospace';
    ctx.fillText(
      `Wind: ${windSpeed} mph ${headwindComponent > 0 ? 'Headwind' : 'Tailwind'}`,
      12,
      20
    );

    // Draw Trajectory curve (Quadratic Bezier)
    // Control point determines the height/apex
    // Ball starts at (startX, groundY), lands at (targetX, landingY)
    const controlX = startX + (targetX - startX) * 0.45 - (headwindComponent * scaleX * 1.5); // wind drags apex
    const controlY = groundY - (apexHeight * scaleY) * 1.5; // Controls flight height

    // Draw complete trajectory path in faded dashed line
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, groundY);
    ctx.quadraticCurveTo(controlX, controlY, targetX, landingY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw Roll Path along the ground
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(targetX, landingY);
    ctx.lineTo(totalX, landingY);
    ctx.stroke();

    // Render Animated Ball and trace trail up to the current progress
    if (progress > 0) {
      // Calculate bezier point at progress t (0 to 1)
      const t = Math.min(progress, 0.999);
      
      // Quadratic Bezier formula: B(t) = (1-t)^2*P0 + 2(1-t)*t*P1 + t^2*P2
      const ballX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * targetX;
      const ballY = (1 - t) * (1 - t) * groundY + 2 * (1 - t) * t * controlY + t * t * landingY;

      // Draw shiny trailing path of the ball
      ctx.strokeStyle = '#3b82f6'; // Bright golf blue
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, groundY);
      
      // Draw bezier segment from 0 to t
      const steps = Math.floor(t * 100);
      for (let s = 0; s <= steps; s++) {
        const currT = s / 100;
        const x = (1 - currT) * (1 - currT) * startX + 2 * (1 - currT) * currT * controlX + currT * currT * targetX;
        const y = (1 - currT) * (1 - currT) * groundY + 2 * (1 - currT) * currT * controlY + currT * currT * landingY;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw the rolling path if ball has landed
      if (progress > 0.99 && totalX > targetX) {
        const rollT = Math.min(1, (progress - 1) / 0.3); // extra 0.3 progress for rolling animation
        const currRollX = targetX + (totalX - targetX) * rollT;
        ctx.strokeStyle = '#fbbf24'; // Orange rolling trail
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(targetX, landingY);
        ctx.lineTo(currRollX, landingY);
        ctx.stroke();

        // Draw rolling ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currRollX, landingY - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Draw flying ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Glowing ball aura
        const ballGlow = ctx.createRadialGradient(ballX, ballY, 1, ballX, ballY, 8);
        ballGlow.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        ballGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = ballGlow;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Legend stats display in bottom corner
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(`Carry: ${carry} yd`, startX, height - 15);
    ctx.fillText(`Total: ${total} yd`, totalX - 25 > startX + 110 ? totalX - 25 : startX + 110, height - 15);
    ctx.fillText(`Apex: ${apexHeight} yd`, width - 110, 20);
  };

  const triggerAnimation = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setProgress(0);

    const duration = 2000; // 2 seconds
    const start = performance.now();

    const animate = (time: number) => {
      const elapsed = time - start;
      const t = Math.min(1.3, elapsed / duration); // 1.3 includes roll time

      setProgress(t);

      if (t < 1.3) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="relative bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800">
      <canvas
        ref={canvasRef}
        width={400}
        height={180}
        className="w-full block h-auto aspect-[40/18]"
      />
      
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={triggerAnimation}
          disabled={isAnimating}
          className="p-1.5 rounded-lg bg-slate-800/80 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors cursor-pointer"
          title="Play Trajectory Flight"
        >
          {isAnimating ? (
            <RotateCcw className="h-3.5 w-3.5 animate-spin text-slate-400" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
