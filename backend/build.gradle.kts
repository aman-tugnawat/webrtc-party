import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

plugins {
    kotlin("jvm") version "1.9.23" // Ensure Kotlin plugin is compatible
    application
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "com.example" // Replace with your actual group ID
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    // Vert.x Core
    implementation("io.vertx:vertx-core:4.5.7")

    // Vert.x Web
    implementation("io.vertx:vertx-web:4.5.7")

    // Kotlin standard library
    implementation(kotlin("stdlib-jdk8"))

    // Add JUnit Jupiter for testing (optional but recommended)
    testImplementation("org.junit.jupiter:junit-jupiter-api:5.10.2")
    testRuntimeOnly("org.junit.jupiter:junit-jupiter-engine:5.10.2")
}

application {
    // Define the main class for the application plugin
    mainClass.set("com.example.backend.MainVerticle") // IMPORTANT: Replace with your actual main verticle class
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions.jvmTarget = "11"
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// Configure the shadow plugin to create a fat JAR
tasks.withType<ShadowJar> {
    archiveBaseName.set("vertx-backend")
    archiveClassifier.set("")
    archiveVersion.set(project.version.toString())
    mergeServiceFiles() // Required for Vert.x service descriptor files
}

// Ensure the 'run' task uses the shadow JAR's classpath if needed,
// or configure it to run directly depending on your setup.
// For Vert.x, usually running the main Verticle is sufficient.
// The `application` plugin's run task should work out of the box
// if the mainClass is set correctly.

// Optional: Task to print the classpath used by the run task for debugging
tasks.register("printRunClasspath") {
    doLast {
        println("Classpath for run task: ${tasks.run.get().classpath.asPath}")
    }
}
