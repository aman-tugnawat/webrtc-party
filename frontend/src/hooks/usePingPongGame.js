import { useState, useEffect, useCallback, useRef } from 'react';

// --- Game Constants ---
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 8;
const INITIAL_BALL_SPEED_X = 4;
const INITIAL_BALL_SPEED_Y = 2;
const PADDLE_COLLISION_SPEED_MULTIPLIER = 1.02;
const MAX_BALL_SPEED_X = 10;
const MAX_BALL_SPEED_Y = 8;
const PADDLE_SPIN_FACTOR = 0.1; // How much paddle hit location affects ball Y velocity

const usePingPongGame = (isHost, dataChannel, myMark) => {
  // --- State ---
  const [paddleY, setPaddleY] = useState({ player1: CANVAS_HEIGHT / 2, player2: CANVAS_HEIGHT / 2 });
  const [ball, setBall] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: INITIAL_BALL_SPEED_X, vy: INITIAL_BALL_SPEED_Y });
  const [score, setScore] = useState({ player1: 0, player2: 0 });

  // --- Refs ---
  // Ref to store latest paddleY state for use inside game loop interval
  // This helps avoid stale closures capturing old paddle positions
  const paddleYRef = useRef(paddleY);
  useEffect(() => {
      paddleYRef.current = paddleY;
  }, [paddleY]);

  // Ref to store latest score state for use inside game loop interval
  const scoreRef = useRef(score);
  useEffect(() => {
      scoreRef.current = score;
  }, [score]);


  // --- Send Message Helper ---
  const sendGameData = useCallback((type, payload) => {
    if (dataChannel?.current && dataChannel.current.readyState === 'open') {
      dataChannel.current.send(JSON.stringify({ type, payload }));
    } else {
      // console.warn(`Data channel not ready, cannot send ${type}`);
    }
  }, [dataChannel]); // Depends on dataChannel ref wrapper

  // --- Paddle Movement ---
  const handleLocalPaddleMove = useCallback((newY) => {
    // Clamping is expected to be done by the component calling this handler
    if (!myMark) return; // Should have 'player1' or 'player2'
    setPaddleY(prev => ({ ...prev, [myMark]: newY }));
    sendGameData('PADDLE_MOVE', { y: newY });
  }, [myMark, sendGameData]);


  // --- Host Game Loop (Physics, Collisions, Scoring) ---
  useEffect(() => {
    if (!isHost || !dataChannel?.current || dataChannel.current.readyState !== 'open') {
      return; // Only run on host when channel is open
    }

    // console.log("Starting host game loop...");
    const intervalId = setInterval(() => {
      setBall(prevBall => {
        let { x, y, vx, vy } = prevBall;
        let currentPaddleY = paddleYRef.current; // Use ref for latest paddle pos
        let currentScore = scoreRef.current; // Use ref for latest score
        let shouldReset = false;

        // 1. Calculate new position
        x += vx;
        y += vy;

        // 2. Wall Collision (Top/Bottom)
        if (y - BALL_RADIUS <= 0 || y + BALL_RADIUS >= CANVAS_HEIGHT) {
          vy = -vy;
          y = prevBall.y + vy; // Adjust position slightly
        }

        // 3. Paddle Collision
        // Player 1 (Host's Paddle)
        if (x - BALL_RADIUS <= PADDLE_WIDTH * 2 && x > PADDLE_WIDTH && vx < 0) { // Check position and direction
            if (y > currentPaddleY.player1 - PADDLE_HEIGHT / 2 && y < currentPaddleY.player1 + PADDLE_HEIGHT / 2) {
                vx = -vx * PADDLE_COLLISION_SPEED_MULTIPLIER;
                x = PADDLE_WIDTH * 2 + BALL_RADIUS; // Prevent sticking
                let deltaY = y - currentPaddleY.player1;
                vy = vy + deltaY * PADDLE_SPIN_FACTOR;
            }
        }
        // Player 2 (Client's Paddle)
        if (x + BALL_RADIUS >= CANVAS_WIDTH - PADDLE_WIDTH * 2 && x < CANVAS_WIDTH - PADDLE_WIDTH && vx > 0) { // Check position and direction
            if (y > currentPaddleY.player2 - PADDLE_HEIGHT / 2 && y < currentPaddleY.player2 + PADDLE_HEIGHT / 2) {
                vx = -vx * PADDLE_COLLISION_SPEED_MULTIPLIER;
                x = CANVAS_WIDTH - PADDLE_WIDTH * 2 - BALL_RADIUS; // Prevent sticking
                let deltaY = y - currentPaddleY.player2;
                vy = vy + deltaY * PADDLE_SPIN_FACTOR;
            }
        }

        // Clamp ball speed after collision adjustments
        vx = Math.max(-MAX_BALL_SPEED_X, Math.min(MAX_BALL_SPEED_X, vx));
        vy = Math.max(-MAX_BALL_SPEED_Y, Math.min(MAX_BALL_SPEED_Y, vy));


        // 4. Scoring
        if (x - BALL_RADIUS < 0) { // Player 2 scores
          currentScore = { ...currentScore, player2: currentScore.player2 + 1 };
          shouldReset = true;
        } else if (x + BALL_RADIUS > CANVAS_WIDTH) { // Player 1 scores
          currentScore = { ...currentScore, player1: currentScore.player1 + 1 };
          shouldReset = true;
        }

        // 5. Create updated ball state
        const updatedBall = {
          x: shouldReset ? CANVAS_WIDTH / 2 : x,
          y: shouldReset ? CANVAS_HEIGHT / 2 : y,
          vx: shouldReset ? (Math.random() > 0.5 ? INITIAL_BALL_SPEED_X : -INITIAL_BALL_SPEED_X) : vx, // Randomize direction
          vy: shouldReset ? (Math.random() * (INITIAL_BALL_SPEED_Y * 2) - INITIAL_BALL_SPEED_Y) : vy // Randomize Y velocity
        };

        // 6. Send updates via Data Channel & Update Host Score State (if changed)
        sendGameData('BALL_UPDATE', { ball: updatedBall });
        if (shouldReset) {
          setScore(currentScore); // Update host score state
          scoreRef.current = currentScore; // Update ref immediately
          sendGameData('SCORE_UPDATE', { score: currentScore });
        }

        return updatedBall; // Return updated state for setBall
      });
    }, 1000 / 60); // ~60 FPS

    return () => {
      // console.log("Stopping host game loop.");
      clearInterval(intervalId);
    };
  // Dependencies: isHost, dataChannel readiness, sendGameData callback. Refs are stable.
  }, [isHost, dataChannel?.current?.readyState, sendGameData]);


  // --- Data Channel Message Handling ---
  useEffect(() => {
    const dc = dataChannel?.current;
    if (!dc) return;

    // console.log("Setting up data channel message handler in hook");
    const handleMessage = (event) => {
      // console.log("Hook received data channel message:", event.data);
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'PADDLE_MOVE' && data.payload?.y !== undefined) {
          // Update opponent's paddle position
          const opponent = myMark === 'player1' ? 'player2' : 'player1';
          if (opponent) { // Ensure myMark is set
             setPaddleY(prev => ({ ...prev, [opponent]: data.payload.y }));
          }
        } else if (data.type === 'BALL_UPDATE' && data.payload?.ball !== undefined) {
          // Client updates ball based on host message
          if (!isHost) {
            setBall(data.payload.ball);
          }
        } else if (data.type === 'SCORE_UPDATE' && data.payload?.score !== undefined) {
          // Client updates score based on host message
          // Host score is updated directly in the game loop
          if (!isHost) {
            setScore(data.payload.score);
             scoreRef.current = data.payload.score; // Update client score ref too
          }
        } else {
           console.warn("Hook received unknown data channel message format:", data);
        }
      } catch (error) {
        console.error("Hook: Error processing data channel message:", error);
      }
    };

    dc.onmessage = handleMessage;

    // Cleanup: Remove the message handler when the hook unmounts or dependencies change
    return () => {
      if (dc) {
        // console.log("Cleaning up data channel message handler in hook");
        dc.onmessage = null;
      }
    };
  // Dependencies: dataChannel wrapper, isHost, myMark (to determine opponent)
  }, [dataChannel, isHost, myMark]);


  // --- Return state and handlers ---
  return { paddleY, ball, score, handleLocalPaddleMove };
};

export default usePingPongGame;
