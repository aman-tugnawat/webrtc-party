import React, { useRef, useEffect, useCallback } from 'react';

interface PingPongGameProps {
    broadcastData: (data: any) => void;
    registerDataCallback: (callback: (data: any, senderId: string) => void) => void;
    isHost: boolean; // Host is Player 1
}

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;
const PADDLE_SPEED = 8; // How fast opponent paddle moves towards target Y
const INITIAL_BALL_SPEED = 5;

const PingPongGame: React.FC<PingPongGameProps> = ({ broadcastData, registerDataCallback, isHost }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Use refs for state accessed within game loop / callbacks
    const paddle1YRef = useRef<number>(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const paddle2YRef = useRef<number>(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const ballXRef = useRef<number>(CANVAS_WIDTH / 2);
    const ballYRef = useRef<number>(CANVAS_HEIGHT / 2);
    const ballSpeedXRef = useRef<number>(INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)); // Random initial direction
    const ballSpeedYRef = useRef<number>(INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1));
    const player1ScoreRef = useRef<number>(0);
    const player2ScoreRef = useRef<number>(0);
    const gameLoopRef = useRef<number | null>(null);
    const localPlayerNumRef = useRef<1 | 2>(isHost ? 1 : 2);
    const opponentPaddleYRef = useRef<number>(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2); // Target Y for opponent paddle

    // --- Reset Game State ---
    const resetBall = useCallback((winner?: 1 | 2) => {
        ballXRef.current = CANVAS_WIDTH / 2;
        ballYRef.current = CANVAS_HEIGHT / 2;
        // Serve towards the player who didn't score, or randomly if initial reset
        const directionX = winner ? (winner === 1 ? -1 : 1) : (Math.random() > 0.5 ? 1 : -1);
        const directionY = Math.random() > 0.5 ? 1 : -1;
        ballSpeedXRef.current = INITIAL_BALL_SPEED * directionX;
        // Add some randomness to Y speed to avoid predictable serves
        ballSpeedYRef.current = (INITIAL_BALL_SPEED * 0.5 + Math.random() * INITIAL_BALL_SPEED * 0.5) * directionY;

        // Host broadcasts the new ball state after reset
        if (isHost) {
            console.log("Host broadcasting ball_sync after reset");
            broadcastData({
                type: 'ball_sync',
                x: ballXRef.current,
                y: ballYRef.current,
                sx: ballSpeedXRef.current,
                sy: ballSpeedYRef.current
            });
             // Also broadcast score update
             broadcastData({
                type: 'score_update',
                p1: player1ScoreRef.current,
                p2: player2ScoreRef.current,
            });
        }
    }, [isHost, broadcastData]);

    const resetGame = useCallback(() => {
        console.log("Resetting Ping Pong game state...");
        player1ScoreRef.current = 0;
        player2ScoreRef.current = 0;
        paddle1YRef.current = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        paddle2YRef.current = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        opponentPaddleYRef.current = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        resetBall(); // Reset ball position and speed

        // Only host should broadcast the reset command to avoid loops
        if (isHost) {
            broadcastData({ type: 'reset' });
            // Host also broadcasts initial state after reset
             broadcastData({
                type: 'score_update',
                p1: player1ScoreRef.current,
                p2: player2ScoreRef.current,
            });
             broadcastData({
                type: 'ball_sync',
                x: ballXRef.current,
                y: ballYRef.current,
                sx: ballSpeedXRef.current,
                sy: ballSpeedYRef.current
            });

        }
    }, [isHost, broadcastData, resetBall]);


    // --- Game Loop Functions ---
    const update = useCallback(() => {
        // Move opponent paddle smoothly towards its target Y
        const opponentPaddleRef = localPlayerNumRef.current === 1 ? paddle2YRef : paddle1YRef;
        const targetY = opponentPaddleYRef.current;
        const currentY = opponentPaddleRef.current;
        if (Math.abs(currentY - targetY) > PADDLE_SPEED / 2) { // Add some threshold
             if (currentY < targetY) {
                opponentPaddleRef.current = Math.min(currentY + PADDLE_SPEED, CANVAS_HEIGHT - PADDLE_HEIGHT);
            } else if (currentY > targetY) {
                opponentPaddleRef.current = Math.max(currentY - PADDLE_SPEED, 0);
            }
        }


        // --- Ball Logic (Primarily Host Authority) ---
        if (isHost) {
            // Move Ball
            ballXRef.current += ballSpeedXRef.current;
            ballYRef.current += ballSpeedYRef.current;

            // Wall Collision (Top/Bottom)
            if (ballYRef.current - BALL_RADIUS < 0 || ballYRef.current + BALL_RADIUS > CANVAS_HEIGHT) {
                ballSpeedYRef.current *= -1;
                 // Clamp ball position to prevent sticking
                 if (ballYRef.current - BALL_RADIUS < 0) ballYRef.current = BALL_RADIUS;
                 if (ballYRef.current + BALL_RADIUS > CANVAS_HEIGHT) ballYRef.current = CANVAS_HEIGHT - BALL_RADIUS;
            }

            // Paddle Collision
            let paddleY, paddleX;
            let hitPaddle1 = false;
            let hitPaddle2 = false;

            // Check Paddle 1 (Left)
            paddleY = paddle1YRef.current;
            paddleX = PADDLE_WIDTH; // Right edge of paddle 1
            if (ballXRef.current - BALL_RADIUS < paddleX && // Ball's left edge crosses paddle's right edge
                ballXRef.current + BALL_RADIUS > 0 && // Ball is not completely behind paddle
                ballYRef.current > paddleY && ballYRef.current < paddleY + PADDLE_HEIGHT)
            {
                 if (ballSpeedXRef.current < 0) { // Only trigger if moving left
                    hitPaddle1 = true;
                 }
            }

            // Check Paddle 2 (Right)
            paddleY = paddle2YRef.current;
            paddleX = CANVAS_WIDTH - PADDLE_WIDTH; // Left edge of paddle 2
            if (ballXRef.current + BALL_RADIUS > paddleX && // Ball's right edge crosses paddle's left edge
                ballXRef.current - BALL_RADIUS < CANVAS_WIDTH && // Ball is not completely behind paddle
                ballYRef.current > paddleY && ballYRef.current < paddleY + PADDLE_HEIGHT)
            {
                 if (ballSpeedXRef.current > 0) { // Only trigger if moving right
                     hitPaddle2 = true;
                 }
            }


            if (hitPaddle1 || hitPaddle2) {
                ballSpeedXRef.current *= -1;
                // Optional: Increase speed slightly on hit?
                // ballSpeedXRef.current *= 1.05;
                 // Optional: Add slight angle change based on where it hits the paddle
                 // let deltaY = ballYRef.current - (paddleY + PADDLE_HEIGHT / 2);
                 // ballSpeedYRef.current = deltaY * 0.3; // Adjust multiplier for sensitivity

                 // Prevent ball getting stuck inside paddle
                 if (hitPaddle1) ballXRef.current = PADDLE_WIDTH + BALL_RADIUS;
                 if (hitPaddle2) ballXRef.current = CANVAS_WIDTH - PADDLE_WIDTH - BALL_RADIUS;

                // Host broadcasts new ball state after paddle hit
                broadcastData({
                    type: 'ball_sync',
                    x: ballXRef.current,
                    y: ballYRef.current,
                    sx: ballSpeedXRef.current,
                    sy: ballSpeedYRef.current
                });
            }


            // Scoring
            if (ballXRef.current - BALL_RADIUS < 0) { // Player 2 scores
                player2ScoreRef.current++;
                console.log("Player 2 scored! Score:", player1ScoreRef.current, "-", player2ScoreRef.current);
                resetBall(1); // Serve towards player 1
            } else if (ballXRef.current + BALL_RADIUS > CANVAS_WIDTH) { // Player 1 scores
                player1ScoreRef.current++;
                 console.log("Player 1 scored! Score:", player1ScoreRef.current, "-", player2ScoreRef.current);
                resetBall(2); // Serve towards player 2
            }
        }
        // Guest relies on host ball_sync messages handled in the data callback

    }, [isHost, resetBall, broadcastData]); // Added dependencies


    const draw = useCallback(() => {
        if (!ctxRef.current || !canvasRef.current) return;
        const ctx = ctxRef.current;

        // Clear Canvas
        ctx.fillStyle = '#111'; // Dark background
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw Paddles
        ctx.fillStyle = '#eee';
        ctx.fillRect(0, paddle1YRef.current, PADDLE_WIDTH, PADDLE_HEIGHT); // Paddle 1 (Left)
        ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, paddle2YRef.current, PADDLE_WIDTH, PADDLE_HEIGHT); // Paddle 2 (Right)

        // Draw Ball
        ctx.beginPath();
        ctx.arc(ballXRef.current, ballYRef.current, BALL_RADIUS, 0, Math.PI * 2, false);
        ctx.fillStyle = '#eee';
        ctx.fill();
        ctx.closePath();

        // Draw Scores
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player1ScoreRef.current.toString(), CANVAS_WIDTH * 0.25, 50);
        ctx.fillText(player2ScoreRef.current.toString(), CANVAS_WIDTH * 0.75, 50);

         // Draw Middle Line (Optional)
         ctx.strokeStyle = '#555';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(CANVAS_WIDTH / 2, 0);
         ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
         ctx.stroke();

    }, []); // No dependencies needed as it reads refs directly

    // --- Game Loop ---
    const gameLoop = useCallback(() => {
        update();
        draw();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [update, draw]);


    // --- Mouse Movement ---
    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        // Calculate mouse Y relative to the canvas, clamp within bounds
        let mouseY = event.clientY - canvasRect.top;
        let newPaddleY = Math.max(0, Math.min(mouseY - PADDLE_HEIGHT / 2, CANVAS_HEIGHT - PADDLE_HEIGHT));

        // Update the correct local paddle ref
        const localPaddleRef = localPlayerNumRef.current === 1 ? paddle1YRef : paddle2YRef;

        // Only update and broadcast if position changed significantly
        if (Math.abs(localPaddleRef.current - newPaddleY) > 1) {
             localPaddleRef.current = newPaddleY;
             // Broadcast new Y position
             broadcastData({ type: 'paddle_move', y: newPaddleY });
        }
    }, [broadcastData]);


    // --- Effect for Setup, Data Callback, and Listeners ---
    useEffect(() => {
        console.log("Setting up Ping Pong Game...");
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Failed to get 2D context");
            return;
        }
        ctxRef.current = ctx;

        // Determine player number
        localPlayerNumRef.current = isHost ? 1 : 2;
        console.log(`You are Player ${localPlayerNumRef.current}`);

        // Reset initial state (especially ball position/speed)
        resetGame();

        // Register Data Callback
        const dataCallback = (data: any, senderId: string) => {
             // console.log(`PingPong received data from ${senderId}:`, data); // Can be noisy
             switch (data.type) {
                case 'paddle_move':
                    // Update the opponent's target Y position
                     opponentPaddleYRef.current = data.y;
                    break;
                case 'ball_sync':
                    // Guest updates ball state based on host's sync message
                    if (!isHost) {
                         // Optional: Add slight interpolation/smoothing later if needed
                         ballXRef.current = data.x;
                         ballYRef.current = data.y;
                         ballSpeedXRef.current = data.sx;
                         ballSpeedYRef.current = data.sy;
                    }
                    break;
                 case 'score_update':
                     // Both players update score based on host message
                     player1ScoreRef.current = data.p1;
                     player2ScoreRef.current = data.p2;
                     break;
                 case 'reset':
                     // Handle reset triggered by opponent (likely host)
                     console.log("Received reset request from opponent.");
                     resetGame(); // Reset local state based on received command
                     break;
                default:
                    console.log('Unknown data type received:', data.type);
            }
        };
        registerDataCallback(dataCallback);

        // Add Mouse Listener
        window.addEventListener('mousemove', handleMouseMove);

        // Start Game Loop
        console.log("Starting game loop...");
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        // Cleanup
        return () => {
            console.log("Cleaning up Ping Pong Game...");
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
            window.removeEventListener('mousemove', handleMouseMove);
            // Unregister callback? (useWebRTC might handle this)
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerDataCallback, isHost, gameLoop, handleMouseMove, resetGame]); // Dependencies for setup


    return (
        <div>
            <h3>Ping Pong</h3>
            {/* Score display could be moved outside canvas if preferred */}
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{ border: '1px solid #ccc', backgroundColor: '#f0f0f0' }}
            />
             {/* Add a reset button, maybe only for host? */}
             {isHost && (
                <button onClick={resetGame} style={{ marginTop: '1rem' }}>
                    Reset Game (Host)
                </button>
             )}
        </div>
    );
};

export default PingPongGame;
