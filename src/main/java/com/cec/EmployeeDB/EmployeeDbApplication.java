package com.cec.EmployeeDB;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class EmployeeDbApplication {

  public static void main(String[] args) {
    SpringApplication.run(EmployeeDbApplication.class, args);
  }
}
