# Backend

Spring Boot application targeting Java 17. From this directory, run the app with:

```bash
mvn spring-boot:run
```

The health endpoint is available at `GET http://localhost:8080/api/health` and returns `{"status":"UP"}`.

Run the backend tests with:

```bash
mvn test
```

Checkstyle runs automatically during Maven validation. To run it directly:

```bash
mvn checkstyle:check
```