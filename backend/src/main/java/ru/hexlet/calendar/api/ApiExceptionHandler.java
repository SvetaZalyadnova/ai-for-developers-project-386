package ru.hexlet.calendar.api;

import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ProblemDetails> handleApiException(ApiException exception) {
        HttpStatus status = exception.status();
        ProblemDetails problem = new ProblemDetails(
                "about:blank",
                status.getReasonPhrase(),
                status.value(),
                exception.getMessage(),
                exception.code(),
                exception.errors());
        return ResponseEntity.status(status)
                .contentType(MediaType.valueOf("application/problem+json"))
                .body(problem);
    }

    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ProblemDetails> handleMalformedRequest(Exception exception) {
        ProblemDetails problem = new ProblemDetails(
                "about:blank",
                "Некорректные данные запроса.",
                HttpStatus.BAD_REQUEST.value(),
                "Проверьте параметры и формат данных запроса.",
                "validation_error",
                List.of());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.valueOf("application/problem+json"));
        return new ResponseEntity<>(problem, headers, HttpStatus.BAD_REQUEST);
    }
}
