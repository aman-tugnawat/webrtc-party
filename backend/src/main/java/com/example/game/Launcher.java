package com.example.game;

import io.vertx.core.Vertx;
import io.vertx.core.VertxOptions;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

public class Launcher {

    private static final Logger LOGGER = LoggerFactory.getLogger(Launcher.class);

    public static void main(String[] args) {
        // Optional: Configure Vert.x options if needed
        VertxOptions options = new VertxOptions();

        // Create a Vert.x instance
        Vertx vertx = Vertx.vertx(options);

        // Deploy the MainVerticle
        vertx.deployVerticle(MainVerticle.class.getName(), res -> {
            if (res.succeeded()) {
                LOGGER.info("MainVerticle deployed successfully with deployment ID: " + res.result());
            } else {
                LOGGER.error("Failed to deploy MainVerticle", res.cause());
                // Optionally shut down Vert.x if deployment fails
                vertx.close();
            }
        });

        // Optional: Add a shutdown hook to close Vert.x gracefully
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            LOGGER.info("Shutting down Vert.x...");
            vertx.close(completion -> {
                if (completion.succeeded()) {
                    LOGGER.info("Vert.x shutdown complete.");
                } else {
                    LOGGER.error("Error during Vert.x shutdown", completion.cause());
                }
            });
        }));
    }
}
