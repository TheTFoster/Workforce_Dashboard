package com.cec.EmployeeDB.Config;

import org.springframework.format.Formatter;
import org.springframework.stereotype.Component;

import java.text.ParseException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Objects;
import org.springframework.lang.NonNull;

@Component
public class LocalDateFormatter implements Formatter<LocalDate> {
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    @Override
    public @NonNull LocalDate parse(@NonNull String text,@NonNull Locale locale) throws ParseException {
        if (text == null || text.trim().isEmpty() || "null".equalsIgnoreCase(text)) {
            throw new ParseException("Input text cannot be null or empty", 0);
        }
        return Objects.requireNonNull(LocalDate.parse(text, formatter), "parsed date cannot be null");
    }

    @Override
    public @NonNull String print(@NonNull LocalDate object,@NonNull Locale locale) {
        return Objects.requireNonNull(object != null ? object.format(formatter) : "", "formatted string cannot be null");
    }
}
