# Game Backend

This directory contains the Java Vert.x backend for the real-time game application.

## Prerequisites

*   Java Development Kit (JDK) 11 or later
*   Apache Maven

## Building the Project

To compile the project and download dependencies, navigate to the `backend` directory in your terminal and run:

```bash
mvn compile
```

## Running the Application

To run the backend server, execute the following command from the `backend` directory:

```bash
mvn exec:java -Dexec.mainClass="com.example.game.Launcher"
```

The server will start and listen for WebSocket connections on port 8080 (by default, as defined in `MainVerticle.java`). You should see log output indicating the server has started, similar to:

```
INFO: HTTP server started on port 8080 and WebSocket ready on /ws
```

## Project Structure

*   `pom.xml`: Maven project configuration, including dependencies.
*   `src/main/java/com/example/game/`: Contains the main Java source code.
    *   `Launcher.java`: Main entry point for the application. Initializes Vert.x and deploys the `MainVerticle`.
    *   `MainVerticle.java`: Core Vert.x verticle that sets up the HTTP server and WebSocket handler for game sessions.
    *   `Session.java`: Represents a game session, managing players and potentially game state (implementation details might vary).