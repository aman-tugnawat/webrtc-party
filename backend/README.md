# Vert.x WebSocket Backend (backend_1)

This project is a simple WebSocket server built using Java and the Vert.x framework. It manages game sessions and facilitates WebRTC signaling between connected clients.

## Prerequisites

*   **Java Development Kit (JDK):** Version 8 or higher.
*   **Apache Maven:** To build the project and manage dependencies.

## Building the Project

1.  Navigate to the `backend_1` directory in your terminal:
    ```bash
    cd backend_1
    ```
2.  Clean and compile the project using Maven:
    ```bash
    mvn clean compile
    ```
    This will download dependencies and compile the Java source code into the `target/classes` directory.

## Running the Project

1.  Make sure you are in the `backend_1` directory.
2.  Run the application using the Maven `exec:java` plugin:
    ```bash
    mvn exec:java -Dexec.mainClass="com.example.MainVerticle"
    ```
3.  The server will start and listen for WebSocket connections on port 8888. You should see output similar to:
    ```
    HTTP server started on port 8888, WebSocket listening on /ws
    ```

## Server Functionality

*   Listens for WebSocket connections on `ws://<your-ip>:8888`.
*   Handles messages for creating and joining game sessions.
*   Relays WebRTC signaling messages (offer, answer, ICE candidates) between players in the same session.
*   Manages player connections and session lifecycles.

## Project Structure

*   `pom.xml`: Maven project configuration, including dependencies (Vert.x Core, Vert.x Web, Jackson Databind).
*   `src/main/java/com/example/`: Contains the Java source code.
    *   `MainVerticle.java`: The main Vert.x verticle that sets up the HTTP/WebSocket server and handles incoming messages.
    *   `SessionManager.java`: Manages active game sessions.
    *   `GameSession.java`: Represents a single game session, holding player information.
    *   `Player.java`: Represents a connected player.
*   `src/main/resources/`: Contains non-code resources (currently empty except for `.gitkeep`).