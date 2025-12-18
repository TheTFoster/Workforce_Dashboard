// src/main/java/com/cec/EmployeeDB/alerts/AlertsScheduler.java
package com.cec.EmployeeDB.alerts;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AlertsScheduler {

  private final NoHoursAlertBatch noHours;         // you already have this
  private final MissedPunchAlertBatch missedPunch; // new

  // Mondays 08:15 CT — last full week (no hours)
  @Scheduled(cron = "0 15 8 * * MON", zone = "America/Chicago")
  public void lastWeek() { noHours.upsertNoHoursLastWeek(); }

  // Tue–Fri 09:00 CT — current week to date (no hours)
  @Scheduled(cron = "0 0 9 * * TUE-FRI", zone = "America/Chicago")
  public void thisWeek() { noHours.upsertNoHoursThisWeek(); }

  // Daily 06:45 CT — previous business day (missed punch)
  @Scheduled(cron = "0 45 6 * * *", zone = "America/Chicago")
  public void missedPunchPrevBizDay() {
    missedPunch.upsertMissedPunchForPrevBusinessDay();
  }
}
