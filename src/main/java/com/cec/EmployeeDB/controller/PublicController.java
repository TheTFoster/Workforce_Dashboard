// src/main/java/com/cec/EmployeeDB/Controller/PublicController.java
package com.cec.EmployeeDB.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class PublicController {
    @GetMapping("/api/ping")
    public Map<String, Object> ping() {
        return Map.of("ok", true);
    }
}
