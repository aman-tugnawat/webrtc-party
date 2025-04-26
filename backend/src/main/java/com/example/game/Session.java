package com.example.game;

import io.vertx.core.http.ServerWebSocket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList; // Use thread-safe list

public class Session {

    private final String sessionCode;
    // Use a thread-safe list as WebSockets can connect/disconnect concurrently
    private final List<ServerWebSocket> players = new CopyOnWriteArrayList<>();
    private ServerWebSocket host; // Added field for the session host

    public Session(String sessionCode) {
        this.sessionCode = sessionCode;
    }

    public String getSessionCode() {
        return sessionCode;
    }

    public void addPlayer(ServerWebSocket playerSocket) {
        if (playerSocket != null && !players.contains(playerSocket)) {
            players.add(playerSocket);
        }
    }

    public void removePlayer(ServerWebSocket playerSocket) {
        if (playerSocket != null) {
            players.remove(playerSocket);
        }
    }

    // Return an immutable view to prevent external modification
    public List<ServerWebSocket> getPlayers() {
        return Collections.unmodifiableList(players);
    }

    public boolean isEmpty() {
        return players.isEmpty();
    }

    public ServerWebSocket getHost() {
        return host;
    }

    public void setHost(ServerWebSocket host) {
        this.host = host;
    }
}
