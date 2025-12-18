package com.cec.EmployeeDB.Config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "batchsync")
@Getter @Setter
public class BatchSyncConfig {

  @Getter @Setter
  public static class LiveMap {
    private String table, id, empCode, tixId, badge, badgeNorm;
    private String name, status, phone, workEmail, personalEmail;
    private String annualSalary, rate1, payType;
    private String department, workLocation, jobCode;
    private String updatedAt, lastBatchId, lastSource;
  }

  @Getter @Setter
  public static class ImportMap {
    private String table, empCode, tixId, badge;
    private String name, status, phone, workEmail, personalEmail;
    private String annualSalary, rate1, payType;
    private String department, workLocation, jobCode;
  }

  private LiveMap live;
  private ImportMap import_;
  public ImportMap getImport() { return import_; }
}