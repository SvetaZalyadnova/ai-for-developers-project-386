package ru.hexlet.calendar.api;

import java.util.List;

public record ProblemDetails(
        String type,
        String title,
        int status,
        String detail,
        String code,
        List<ApiFieldError> errors) {
}
