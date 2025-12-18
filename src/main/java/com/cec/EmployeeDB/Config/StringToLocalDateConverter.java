package com.cec.EmployeeDB.Config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.lang.NonNull;

@Component
public class StringToLocalDateConverter implements Converter<String, LocalDate> {
    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public LocalDate convert(@NonNull String source) {
        if (source == null || source.trim().isEmpty() || "null".equalsIgnoreCase(source)) {
            return null;
        }
        return LocalDate.parse(source, formatter);
    }
}
