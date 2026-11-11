FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-17-alpine AS backend-build

WORKDIR /app/backend
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist/ ./src/main/resources/static/
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app
COPY --from=backend-build /app/backend/target/booking-calendar-0.0.1-SNAPSHOT.jar ./app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]