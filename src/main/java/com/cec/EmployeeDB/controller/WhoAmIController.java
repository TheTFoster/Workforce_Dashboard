// src/main/java/com/cec/EmployeeDB/controller/WhoAmIController.java
package com.cec.EmployeeDB.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpSession;
import java.util.Map;

@RestController
public class WhoAmIController {
  @GetMapping("/api/whoami")
  public Map<String, Object> whoami(Authentication auth, HttpSession session) {
    return Map.of(
      "authenticated", auth != null,
      "name", auth != null ? auth.getName() : null,
      "sessionId", session != null ? session.getId() : null
    );
  }
}
