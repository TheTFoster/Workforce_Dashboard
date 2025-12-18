package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.KpiDashboardDTO;
import com.cec.EmployeeDB.Service.KpiService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/kpis")
@RequiredArgsConstructor
@CrossOrigin
public class KpiController {
    
    private static final Logger logger = LoggerFactory.getLogger(KpiController.class);
    private final KpiService kpiService;

    @GetMapping("/dashboard")
    public ResponseEntity<KpiDashboardDTO> getDashboardKpis() {
        logger.info("Fetching KPI dashboard data");
        try {
            KpiDashboardDTO kpis = kpiService.getDashboardKpis();
            return ResponseEntity.ok(kpis);
        } catch (Exception e) {
            logger.error("Error fetching KPI dashboard", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
