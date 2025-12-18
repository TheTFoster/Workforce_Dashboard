// src/main/java/com/cec/EmployeeDB/controller/CsrfController.java
package com.cec.EmployeeDB.controller;

import java.util.Map;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CsrfController {
  @GetMapping("/csrf-token")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken());
  }
}
