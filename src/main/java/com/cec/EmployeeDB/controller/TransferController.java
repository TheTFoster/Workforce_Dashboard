package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.NewTransferDto;
import com.cec.EmployeeDB.Dto.TransferDto;
import com.cec.EmployeeDB.Dto.UpdateTransferStatusDto;
import com.cec.EmployeeDB.Entity.Transfer;
import com.cec.EmployeeDB.Entity.TransferHighlight;
import com.cec.EmployeeDB.Repo.TransferRepository;
import com.cec.EmployeeDB.Repo.TransferHighlightRepository;
import com.cec.EmployeeDB.Dto.TransferHighlightDto;
import com.cec.EmployeeDB.Service.TransferSyncService;
import org.springframework.security.core.Authentication;
import java.time.LocalDateTime;
import java.time.LocalDate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Objects;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/transfers")
@CrossOrigin(origins = "http://localhost:3000")
public class TransferController {

  private final TransferRepository repo;
  private final TransferSyncService syncService;

  // Optional: repository for highlights (shared/global per-transfer highlight)
  private TransferHighlightRepository highlightRepo;

  public TransferController(TransferRepository repo, TransferHighlightRepository highlightRepo,
      TransferSyncService syncService) {
    this.repo = repo;
    this.highlightRepo = highlightRepo;
    this.syncService = syncService;
  }

  // ---------------------------------------------------------------------
  // Helper: entity -> DTO
  // ---------------------------------------------------------------------
  private TransferDto toDto(Transfer t) {
    if (t == null)
      return null;

    return new TransferDto(
        t.getTransferId(),
        t.getEmpCode(),
        t.getXid(),
        t.getEmpName(),
        t.getClassification(),
        t.getFromJobsite(),
        t.getToJobsite(),
        t.getEffectiveDate(),
        t.getRateHourly(),
        t.getRateType() != null ? t.getRateType().name() : null,
        t.getEvaluationScore(),
        t.getNotes(),
        t.getEmail(),
        t.getLicense1(),
        t.getLicense2(),
        t.getLicense3(),
        t.getLicense4(),
        t.getContactPhone(),
        t.getLocationCity(),
        t.getLocationState(),
        t.getSheetDate(),
        t.getLastPayChange(),
        t.getHireDate(),
        t.getBadging(),
        t.getLevel1Status(),
        t.getScissorLiftStatus(),
        t.getCorrectiveAction(),
        t.getLanguage(),
        t.getGroup(),
        t.getNewGroup(),
        t.getJobsitesOfInterest(),
        t.getUpdates(),
        t.getNewHireFollowUp(),
        t.getOsha10Date(),
        t.getOsha30Date(),
        t.getTransferStatus(),
        t.getTerm(),
        t.getPerDiem(),
        t.getSourceFile(),
        t.getTravelPreference(),
        t.getIsArchived(),
        t.getCreatedAt(),
        t.getUpdatedAt(),
        t.getEmpCodeNormKey(),
        t.getEffKey(),
        t.getFromJobsiteKey(),
        t.getToJobsiteKey());
  }

  // ---------------------------------------------------------------------
  // GET: list all transfers for Transfers page (non-archived only)
  // ---------------------------------------------------------------------
  @GetMapping
  public ResponseEntity<List<TransferDto>> listAll() {
    List<TransferDto> dtos = repo.findByIsArchivedFalseOrderByEffectiveDateDesc()
        .stream()
        .map(this::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
  }

  // ---------------------------------------------------------------------
  // GET: list archived transfers for the Archived Entries tab
  // ---------------------------------------------------------------------
  @GetMapping("/archived")
  public ResponseEntity<List<TransferDto>> listArchived() {
    List<TransferDto> dtos = repo.findByIsArchivedTrueOrderByEffectiveDateDesc()
        .stream()
        .map(this::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
  }

  // ---------------------------------------------------------------------
  // POST: create a new transfer (used by "New Transfer" workflow)
  // NOTE: Only sets fields that actually exist on NewTransferDto.
  // DB-generated columns (emp_code_norm_key, eff_key, *_key) are not touched.
  // ---------------------------------------------------------------------
  @PostMapping
  public ResponseEntity<?> create(@RequestBody NewTransferDto dto, HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped create"));
    }
    // Allow saving drafts: do not require empCode, toJobsite, or effectiveDate
    Transfer t = new Transfer();

    // Identity / routing
    t.setEmpCode(dto.empCode());
    // emp_code_norm_key is a generated column in the DB – do not set it here
    t.setXid(dto.xid());
    t.setEmpName(dto.empName());
    t.setClassification(dto.classification());
    t.setFromJobsite(dto.fromJobsite());
    t.setToJobsite(dto.toJobsite());

    // Dates
    t.setEffectiveDate(dto.effectiveDate());
    // eff_key is generated from effective_date – do not set explicitly
    t.setLastPayChange(dto.lastPayChange());
    t.setOsha10Date(dto.osha10Date());
    t.setOsha30Date(dto.osha30Date());
    // sheetDate may not be on NewTransferDto – leave null if not provided

    // Status / pay
    t.setTransferStatus(dto.transferStatus());
    t.setTerm(dto.term());
    t.setRateHourly(dto.rateHourly());
    if (dto.rateType() != null) {
      try {
        t.setRateType(Transfer.RateType.valueOf(dto.rateType()));
      } catch (IllegalArgumentException ex) {
        t.setRateType(Transfer.RateType.unknown);
      }
    } else {
      t.setRateType(Transfer.RateType.unknown);
    }
    t.setPerDiem(dto.perDiem());
    t.setEvaluationScore(dto.evaluationScore());

    // Contact / misc text
    t.setNotes(dto.notes());
    t.setEmail(dto.email());
    t.setLicense1(dto.license1());
    t.setLicense2(dto.license2());
    t.setLicense3(dto.license3());
    t.setLicense4(dto.license4());
    t.setContactPhone(dto.contactPhone());
    t.setLocationCity(dto.locationCity());
    t.setLocationState(dto.locationState());
    t.setBadging(dto.badging());
    t.setLevel1Status(dto.level1Status());
    t.setScissorLiftStatus(dto.scissorLiftStatus());
    t.setCorrectiveAction(dto.correctiveAction());
    t.setLanguage(dto.language());
    t.setGroup(dto.group());
    t.setNewGroup(dto.newGroup());
    t.setJobsitesOfInterest(dto.jobsitesOfInterest());
    t.setUpdates(dto.updates());
    t.setNewHireFollowUp(dto.newHireFollowUp());

    // Project / file metadata – only if NewTransferDto exposes them
    // t.setProject(dto.project());
    // t.setSheetDate(dto.sheetDate());
    // t.setSourceFile(dto.sourceFile());

    Transfer saved = repo.save(t);

    // Sync transfer data to Employee entity
    boolean isCompleted = syncService.isTransferCompleted(saved.getTransferStatus());
    syncService.syncTransferToEmployee(saved, isCompleted);

    var response = ResponseEntity.ok(toDto(saved));
    return response;
  }

  // ---- PUT: partial update from the edit popup ----
  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id,
      @RequestBody TransferDto dto,
      HttpServletRequest req) {

    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req) || (id != null && id <= 0)) {
      return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped update", "id", id));
    }
    if (id == null) {
      return ResponseEntity.badRequest().body("Transfer ID is required.");
    }

    return repo.findById(id)
        .map(t -> {
          // Identity / routing
          if (dto.empCode() != null && !dto.empCode().isBlank()) {
            t.setEmpCode(dto.empCode());
          }
          if (dto.xid() != null) {
            t.setXid(dto.xid());
          }
          if (dto.empName() != null) {
            t.setEmpName(dto.empName());
          }
          if (dto.classification() != null) {
            t.setClassification(dto.classification());
          }
          if (dto.fromJobsite() != null) {
            t.setFromJobsite(dto.fromJobsite());
          }
          if (dto.toJobsite() != null) {
            t.setToJobsite(dto.toJobsite());
          }

          // Dates (generated columns like eff_key are left alone)
          if (dto.effectiveDate() != null) {
            t.setEffectiveDate(dto.effectiveDate());
          }
          if (dto.sheetDate() != null) {
            t.setSheetDate(dto.sheetDate());
          }
          if (dto.lastPayChange() != null) {
            t.setLastPayChange(dto.lastPayChange());
          }
          if (dto.hireDate() != null) {
            t.setHireDate(dto.hireDate());
          }
          if (dto.osha10Date() != null) {
            t.setOsha10Date(dto.osha10Date());
          }
          if (dto.osha30Date() != null) {
            t.setOsha30Date(dto.osha30Date());
          }

          // Status / pay
          if (dto.transferStatus() != null) {
            t.setTransferStatus(dto.transferStatus());
          }
          if (dto.term() != null) {
            t.setTerm(dto.term());
          }
          if (dto.rateHourly() != null) {
            t.setRateHourly(dto.rateHourly());
          }
          if (dto.rateType() != null && !dto.rateType().isBlank()) {
            try {
              t.setRateType(Transfer.RateType.valueOf(dto.rateType()));
            } catch (IllegalArgumentException ex) {
              t.setRateType(Transfer.RateType.unknown);
            }
          }
          if (dto.perDiem() != null) {
            t.setPerDiem(dto.perDiem());
          }
          if (dto.evaluationScore() != null) {
            t.setEvaluationScore(dto.evaluationScore());
          }
          // Allow null values to clear travel preference (always update if DTO has the
          // field)
          t.setTravelPreference(dto.travelPreference());

          // Contact / misc text
          if (dto.notes() != null) {
            t.setNotes(dto.notes());
          }
          if (dto.email() != null) {
            t.setEmail(dto.email());
          }
          if (dto.license1() != null) {
            t.setLicense1(dto.license1());
          }
          if (dto.license2() != null) {
            t.setLicense2(dto.license2());
          }
          if (dto.license3() != null) {
            t.setLicense3(dto.license3());
          }
          if (dto.license4() != null) {
            t.setLicense4(dto.license4());
          }
          if (dto.contactPhone() != null) {
            t.setContactPhone(dto.contactPhone());
          }
          if (dto.locationCity() != null) {
            t.setLocationCity(dto.locationCity());
          }
          if (dto.locationState() != null) {
            t.setLocationState(dto.locationState());
          }
          if (dto.badging() != null) {
            t.setBadging(dto.badging());
          }
          if (dto.level1Status() != null) {
            t.setLevel1Status(dto.level1Status());
          }
          if (dto.scissorLiftStatus() != null) {
            t.setScissorLiftStatus(dto.scissorLiftStatus());
          }
          if (dto.correctiveAction() != null) {
            t.setCorrectiveAction(dto.correctiveAction());
          }
          if (dto.language() != null) {
            t.setLanguage(dto.language());
          }
          if (dto.group() != null) {
            t.setGroup(dto.group());
          }
          if (dto.newGroup() != null) {
            t.setNewGroup(dto.newGroup());
          }
          if (dto.jobsitesOfInterest() != null) {
            t.setJobsitesOfInterest(dto.jobsitesOfInterest());
          }
          if (dto.updates() != null) {
            t.setUpdates(dto.updates());
          }
          if (dto.newHireFollowUp() != null) {
            t.setNewHireFollowUp(dto.newHireFollowUp());
          }

          // File metadata
          if (dto.sourceFile() != null) {
            t.setSourceFile(dto.sourceFile());
          }

          // Archive status
          if (dto.isArchived() != null) {
            t.setIsArchived(dto.isArchived());
          }

          Transfer saved = repo.save(Objects.requireNonNull(t));

          // Sync transfer updates to Employee entity
          boolean isCompleted = syncService.isTransferCompleted(saved.getTransferStatus());
          syncService.syncTransferToEmployee(saved, isCompleted);

          return ResponseEntity.ok(toDto(saved));
        })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  // ---------------------------------------------------------------------
  // DELETE: delete a transfer by ID (for archived entries)
  // ---------------------------------------------------------------------
  @DeleteMapping("/{id}")
  public ResponseEntity<?> deleteTransfer(@PathVariable Long id, HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req) || (id != null && id <= 0)) {
      return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped delete", "id", id));
    }
    if (id == null) {
      return ResponseEntity.badRequest().body("Transfer ID is required.");
    }

    Long requiredId = Objects.requireNonNull(id);
    Transfer t = repo.findById(requiredId).orElse(null);
    if (t == null) {
      return ResponseEntity.notFound().build();
    }
    repo.deleteById(requiredId);
    return ResponseEntity.ok().build();
  }

  // ---------------------------------------------------------------------
  // GET: by Employee Code (for employee form sync)
  // ---------------------------------------------------------------------
  @GetMapping("/by-emp-code/{empCode}")
  public ResponseEntity<List<TransferDto>> byEmpCode(@PathVariable String empCode) {
    List<TransferDto> dtos = repo.findByEmpCodeOrderByEffectiveDateDesc(empCode)
        .stream()
        .map(this::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
  }

  // ---------------------------------------------------------------------
  // GET: by XID (if needed elsewhere in UI)
  // ---------------------------------------------------------------------
  @GetMapping("/by-xid/{xid}")
  public ResponseEntity<List<TransferDto>> byXid(@PathVariable String xid) {
    List<TransferDto> dtos = repo.findByXidOrderByEffectiveDateDesc(xid)
        .stream()
        .map(this::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
  }

  // ---------------------------------------------------------------------
  // GET: upcoming/active transfers for Gantt view predictions
  // Returns transfers with effective dates from N days ago to future
  // ---------------------------------------------------------------------
  @GetMapping("/upcoming")
  public ResponseEntity<List<TransferDto>> getUpcomingTransfers(
      @RequestParam(required = false, defaultValue = "30") Integer daysBack) {
    LocalDate startDate = LocalDate.now().minusDays(daysBack);
    List<TransferDto> dtos = repo.findUpcomingTransfers(startDate)
        .stream()
        .map(this::toDto)
        .toList();
    return ResponseEntity.ok(dtos);
  }

  // ---------------------------------------------------------------------
  // GET: transfers in date range for Gantt view
  // ---------------------------------------------------------------------
  @GetMapping("/range")
  public ResponseEntity<List<TransferDto>> getTransfersInRange(
      @RequestParam String startDate,
      @RequestParam String endDate) {
    try {
      LocalDate start = LocalDate.parse(startDate);
      LocalDate end = LocalDate.parse(endDate);
      List<TransferDto> dtos = repo.findTransfersInRange(start, end)
          .stream()
          .map(this::toDto)
          .toList();
      return ResponseEntity.ok(dtos);
    } catch (Exception e) {
      return ResponseEntity.badRequest().build();
    }
  }

  // ---------------------------------------------------------------------
  // PATCH: status only (row-level dropdown on list)
  // ---------------------------------------------------------------------
  @PatchMapping("/{id}/status")
  public ResponseEntity<?> updateStatus(@PathVariable Long id,
      @RequestBody UpdateTransferStatusDto dto,
      HttpServletRequest req) {
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req) || (id != null && id <= 0)) {
      return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped status update", "id", id));
    }
    // Allow clearing the status by accepting null or blank values from client.
    // If client sends null/blank, persist a null transferStatus which represents
    // "cleared".
    final String incoming = dto == null ? null : dto.status();

    if (id == null) {
      return ResponseEntity.badRequest().body("Transfer ID is required.");
    }

    try {
      return repo.findById(id)
          .map(t -> {
            if (incoming == null || incoming.isBlank()) {
              t.setTransferStatus(null);
            } else {
              t.setTransferStatus(incoming);
            }
            // Update timestamp
            t.setUpdatedAt(LocalDateTime.now());
            Transfer saved = repo.save(t);

            // Sync status change to Employee entity (especially important for "completed")
            boolean isCompleted = syncService.isTransferCompleted(saved.getTransferStatus());
            syncService.syncTransferToEmployee(saved, isCompleted);

            return (ResponseEntity<?>) ResponseEntity.ok(toDto(saved));
          })
          .orElseGet(() -> ResponseEntity.notFound().build());
    } catch (Exception e) {
      System.err.println("[TransferController] Error updating status for id=" + id + ": " + e.getMessage());
      e.printStackTrace();
      return ResponseEntity.status(500).body("Error updating transfer status: " + e.getMessage());
    }
  }

  // ---------------------------------------------------------------------
  // Highlights: shared per-transfer highlight color
  // ---------------------------------------------------------------------
  @GetMapping("/highlights")
  public ResponseEntity<?> listHighlights() {
    if (highlightRepo == null)
      return ResponseEntity.ok(java.util.List.of());
    var all = highlightRepo.findAll()
        .stream()
        .map(h -> new TransferHighlightDto(h.getTransferId(), h.getColor(), h.getCreatedBy(), h.getUpdatedAt()))
        .toList();
    return ResponseEntity.ok(all);
  }

  @PostMapping("/highlights")
  public ResponseEntity<?> upsertHighlight(Authentication auth, @RequestBody java.util.Map<String, Object> body, HttpServletRequest req) {
    if (highlightRepo == null)
      return ResponseEntity.status(500).body("Highlights not available");
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped highlight upsert"));
    }
    if (body == null || body.get("transferId") == null) {
      return ResponseEntity.badRequest().body("transferId is required");
    }
    Long transferId = null;
    try {
      Object transferIdObj = body.get("transferId");
      if (transferIdObj != null) {
        transferId = Long.valueOf(transferIdObj.toString());
      }
    } catch (Exception ex) {
      return ResponseEntity.badRequest().body("invalid transferId");
    }
    if (transferId == null) {
      return ResponseEntity.badRequest().body("transferId is required");
    }
    Long finalTransferId = Objects.requireNonNull(transferId); // Already validated as non-null above
    String color = body.get("color") == null ? null : body.get("color").toString();
    String user = auth != null ? auth.getName() : "anonymous";

    var exist = highlightRepo.findByTransferId(finalTransferId);
    if (color == null || color.isBlank()) {
      // remove
      exist.ifPresent(highlightRepo::delete);
      return ResponseEntity.ok().build();
    }

    var now = LocalDateTime.now();
    TransferHighlight h = exist.orElseGet(TransferHighlight::new);
    h.setTransferId(finalTransferId);
    h.setColor(color);
    if (h.getCreatedAt() == null)
      h.setCreatedAt(now);
    h.setUpdatedAt(now);
    h.setCreatedBy(user);

    var saved = highlightRepo.save(h);
    return ResponseEntity.ok(
        new TransferHighlightDto(saved.getTransferId(), saved.getColor(), saved.getCreatedBy(), saved.getUpdatedAt()));
  }

  @DeleteMapping("/highlights/{transferId}")
  public ResponseEntity<?> deleteHighlight(@PathVariable Long transferId, HttpServletRequest req) {
    if (highlightRepo == null)
      return ResponseEntity.status(500).body("Highlights not available");
    if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
      return ResponseEntity.ok().build();
    }
    var exist = highlightRepo.findByTransferId(transferId);
    if (exist.isPresent()) {
      exist.ifPresent(highlightRepo::delete);
      return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
  }
}
