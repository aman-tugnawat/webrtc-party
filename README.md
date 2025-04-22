# Vert.x + React WebRTC Game Framework

## Overview

This project provides a basic framework for creating and playing simple multiplayer browser games using WebRTC for peer-to-peer communication. The backend is built with Vert.x (Java), handling WebSocket signaling for session management and WebRTC negotiation. The frontend is built with React and Vite.

Currently, it includes a functional Tic Tac Toe game implementation. A Ping Pong game implementation has been started but is **incomplete**.

**Tech Stack:**

*   **Backend:** Java 11, Vert.x 4.5.7 (Core, Web), Maven
*   **Frontend:** React, Vite, JavaScript
*   **Communication:** WebSockets (for signaling), WebRTC (for game data)

## Features

*   Create new game sessions with unique 4-character codes.
*   Join existing game sessions using the code.
*   Basic waiting room showing player count.
*   Host-controlled game start.
*   Functional Tic Tac Toe game example using WebRTC data channels.
*   Basic framework for adding other P2P games.

## Setup

### Prerequisites

*   **JDK 11 or later:** Required for the backend.
*   **Node.js and npm/yarn:** Required for the frontend (includes Vite).
*   **Maven:** Required to build and run the backend Vert.x application.

### Backend (`backend/`)

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Build the application:**
    *   Compile the Java code using Maven:
        ```bash
        mvn clean package
        ```
    *   This will create an executable JAR file in the `target/` directory (e.g., `game-backend-1.0.0-SNAPSHOT.jar`).

3.  **Run the application:**
    *   Execute the JAR file:
        ```bash
        java -jar target/game-backend-1.0.0-SNAPSHOT.jar
        ```
    *   Alternatively, you can run the `Launcher` class directly from your IDE.
    *   The backend server will start, listening on port 8080 for WebSocket connections (`ws://localhost:8080/ws`).

### Frontend (`frontend/`)

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    *   Using npm:
        ```bash
        npm install
        ```
    *   Or using yarn:
        ```bash
        yarn install
        ```
3.  **Run the development server:**
    *   Using npm:
        ```bash
        npm run dev
        ```
    *   Or using yarn:
        ```bash
        yarn dev
        ```
    *   Vite will start the development server, typically accessible at `http://localhost:5173` (check the terminal output for the exact URL).

## Usage

1.  **Access the Application:** Open your web browser and navigate to the URL provided by the Vite development server (e.g., `http://localhost:5173`).
2.  **Create a Session:** Click the "Create New Game" button on the home page. You will be taken to the waiting room, and a unique 4-character session code will be displayed.
3.  **Join a Session:**
    *   Another player opens the application in their browser.
    *   They enter the 4-character session code provided by the host into the input field and click "Join Game".
4.  **Waiting Room:**
    *   All players in the session will see the session code and the current number of connected players.
    *   The player who created the session (the host) will see a "Start Game" button. Other players will see a "Waiting for host..." message.
5.  **Start Game:** The host clicks the "Start Game" button to begin.
6.  **Play Tic Tac Toe:**
    *   The host is assigned 'X', the other player 'O'.
    *   Players take turns clicking on an empty cell in the 3x3 grid.
    *   The game status indicates whose turn it is.
    *   The game ends when a player gets three marks in a row (horizontally, vertically, or diagonally) or when the board is full (a draw). The winner or draw status is displayed.

## Known Issues

*   **Ping Pong Incomplete:** The Ping Pong game implementation (`PingPongGame.jsx`, `usePingPongGame.js`) was started but is not fully functional or integrated. The application currently defaults to Tic Tac Toe.
*   **Error Handling:** Basic error handling exists, but could be more robust (e.g., handling WebRTC connection failures more gracefully).
*   **Scalability:** Designed primarily for two-player games. Supporting more players would require significant changes to session and WebRTC connection management.
*   **UI/UX:** Styling is very basic. No game selection mechanism is implemented yet.
