# ---------- build stage ----------
# If your project uses Java 22 (your logs showed Java 22.0.2), keep 22 here.
# If your build toolchain is on 21/17, change both images accordingly.
FROM maven:3.9-eclipse-temurin-22 AS build

WORKDIR /src

# Optimize build caching: copy pom first, then sources
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

# ---------- runtime stage ----------
# Use a slim JRE at runtime. If 22-jre-alpine isn't available in your env,
# switch to eclipse-temurin:22-jre or eclipse-temurin:22-jdk (heavier).
FROM eclipse-temurin:22-jre-alpine

# App home
WORKDIR /app

# Default JVM opts (tunable at run-time)
ENV JAVA_OPTS=""

# Configure the port your app binds to (you said 8086)
ARG APP_PORT=8086
ENV SERVER_PORT=${APP_PORT}
EXPOSE ${SERVER_PORT}

# Copy the built jar (wildcard so version bumps don't break the image)
COPY --from=build /src/target/*-SNAPSHOT.jar /app/app.jar

# Create and use a non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

# Optional: healthcheck (requires Spring Boot Actuator on /actuator/health)
# RUN apk add --no-cache curl
# HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
#   CMD curl -fsS http://localhost:${SERVER_PORT}/actuator/health || exit 1

# Use sh -c so $JAVA_OPTS expands; 'exec' for proper signal handling
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
