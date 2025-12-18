// src/main/java/com/cec/EmployeeDB/Config/SpaForwardController.java
package com.cec.EmployeeDB.Config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardController {
  @RequestMapping({
    "/privacy",
    "/terms",
    "/gantt",
    "/employee-details/**",
    "/employee/**",
    "/reports",
    "/transfers"
  })
  public String forward() {
    return "forward:/index.html";
  }
}
