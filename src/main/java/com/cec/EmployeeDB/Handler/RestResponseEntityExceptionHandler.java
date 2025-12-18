package com.cec.EmployeeDB.Handler;

import org.hibernate.validator.internal.engine.path.PathImpl;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ResponseEntity;
import jakarta.validation.ConstraintViolationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.stream.Collectors;

class ApiError {
    private String status;
    private String message;
    private String details;

    public ApiError(String status, String message, String details) {
        this.status = status;
        this.message = message;
        this.details = details;
    }
    public String getStatus() { return status; }
    public String getMessage() { return message; }
    public String getDetails() { return details; }
}

@ControllerAdvice
public class RestResponseEntityExceptionHandler {

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatchException(MethodArgumentTypeMismatchException ex) {
        ApiError error = new ApiError(
                "error",
                "Invalid type for parameter",
                "Parameter: " + ex.getName() + ", value: " + ex.getValue() + ". " + ex.getMessage()
        );
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolationException(ConstraintViolationException ex) {
    String details = ex.getConstraintViolations().stream()
        .map(cv -> ((PathImpl) cv.getPropertyPath()).getLeafNode().getName() + ": " + cv.getMessage())
        .collect(Collectors.joining(", "));
    ApiError error = new ApiError(
        "error",
        "Validation failed",
        details
    );
    return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleJsonParseError(HttpMessageNotReadableException ex) {
        ApiError error = new ApiError(
                "error",
                "Invalid JSON",
                ex.getMessage()
        );
        return ResponseEntity.badRequest().body(error);
    }


    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationExceptions(MethodArgumentNotValidException ex) {
    String details = ex.getBindingResult()
        .getFieldErrors()
        .stream()
        .map(DefaultMessageSourceResolvable::getDefaultMessage)
        .collect(Collectors.joining(", "));
    ApiError error = new ApiError(
        "error",
        "Validation failed",
        details
    );
    return ResponseEntity.badRequest().body(error);
    }
}
