package com.cec.EmployeeDB.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.lang.NonNull;
import java.util.Objects;

@Configuration
public class WebConfigurer implements WebMvcConfigurer {

    private final LocalDateFormatter localDateFormatter;

    public WebConfigurer(LocalDateFormatter localDateFormatter) {
        this.localDateFormatter = localDateFormatter;
    }

    @Override
    public void addFormatters(@NonNull FormatterRegistry registry) {
        registry.addFormatter(Objects.requireNonNull(localDateFormatter, "localDateFormatter cannot be null"));
    }
}
