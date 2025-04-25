package com.example;

import io.vertx.core.http.ServerWebSocket; // Added import

public class Player {
    private final String playerId;
    private transient ServerWebSocket webSocket; // Added field, marked transient

    public Player(String playerId) {
        this.playerId = playerId;
    }

    public String getPlayerId() {
        return playerId;
    }

    // Added setter
    public void setWebSocket(ServerWebSocket webSocket) {
        this.webSocket = webSocket;
    }

    // Added getter
    public ServerWebSocket getWebSocket() {
        return webSocket;
    }

    // equals and hashCode based on playerId
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Player player = (Player) o;
        return java.util.Objects.equals(playerId, player.playerId);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(playerId);
    }

    @Override
    public String toString() {
        // Avoid printing websocket details
        return "Player{" +
               "playerId='" + playerId + '\'' +
               '}';
    }
}
