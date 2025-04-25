import React, { useRef, useEffect } from 'react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 8;

function PingPongGame({ paddleY, ball }) { // Receive state as props
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const animationFrameId = useRef(null);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    contextRef.current = ctx;
  }, []);

  // Drawing function
  const draw = (ctx, state) => {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw paddles
    ctx.fillStyle = 'white';
    // Player 1 (left)
    ctx.fillRect(PADDLE_WIDTH, state.paddleY.player1 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
    // Player 2 (right)
    ctx.fillRect(CANVAS_WIDTH - 2 * PADDLE_WIDTH, state.paddleY.player2 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    if (state.ball) {
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw middle line (optional)
    ctx.strokeStyle = 'grey';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
  };

  // Game loop
  useEffect(() => {
    const loop = () => {
      const ctx = contextRef.current;
      if (ctx) {
        // Pass the current game state to draw
        draw(ctx, { paddleY, ball });
      }
      animationFrameId.current = requestAnimationFrame(loop);
    };

    // Start the loop
    animationFrameId.current = requestAnimationFrame(loop);

    // Cleanup function to cancel the loop when component unmounts
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [paddleY, ball]); // Re-run loop effect if state props change (will redraw)

  return (
    <canvas
      ref={canvasRef}
      style={{ border: '1px solid white' }}
    />
  );
}

export default PingPongGame;
