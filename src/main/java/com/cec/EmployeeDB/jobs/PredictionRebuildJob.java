package com.cec.EmployeeDB.jobs;

import com.cec.EmployeeDB.Service.TimecardPredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
public class PredictionRebuildJob {
  private final TimecardPredictionService svc;

  // 2:15am server time, daily
  @Scheduled(cron = "0 15 2 * * *")
  public void runNightly() {
    try { svc.rebuildAllPredictions(28); } catch (Exception ignored) {}
  }
}