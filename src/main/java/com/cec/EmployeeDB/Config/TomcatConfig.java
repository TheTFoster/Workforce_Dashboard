package com.cec.EmployeeDB.Config;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.web.embedded.tomcat.TomcatConnectorCustomizer;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TomcatConfig {

    @Bean
    public TomcatServletWebServerFactory servletContainer() {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();

        TomcatConnectorCustomizer customizer = (Connector connector) -> {
            connector.setProperty("relaxedPathChars", "<>[\\]^`{|}"); // if you need them
            connector.setProperty("relaxedQueryChars", "<>[\\]^`{|}");
            connector.setMaxPostSize(10 * 1024 * 1024); 
            connector.setMaxSavePostSize(10 * 1024 * 1024);

            // Optional: Adjust connection timeout
            connector.setProperty("connectionTimeout", "20000"); // 20 seconds
        };

        factory.addConnectorCustomizers(customizer);
        return factory;
    }
}
