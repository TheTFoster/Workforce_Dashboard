package com.cec.EmployeeDB.EmployeeController;

import jakarta.servlet.http.HttpServletResponse;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import com.cec.EmployeeDB.Dto.EmpCodeBatchRequest;
import com.cec.EmployeeDB.Dto.EmployeeDTO;
import com.cec.EmployeeDB.Dto.EmployeeDetailsDTO;
import com.cec.EmployeeDB.Dto.EmployeeFilterCriteria;
import com.cec.EmployeeDB.Dto.LoginDTO;
import com.cec.EmployeeDB.Dto.TimelineEventDTO;
import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Entity.EmployeeFile;
import com.cec.EmployeeDB.Repo.EmployeeFileRepository;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import com.cec.EmployeeDB.Service.EmployeeDetailsService;
import com.cec.EmployeeDB.Service.EmployeeService;
import com.cec.EmployeeDB.payloadresponse.LoginMessage;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.beans.PropertyEditorSupport;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/employee")
public class EmployeeController {

    private static final Logger logger = LoggerFactory.getLogger(EmployeeController.class);

    private final EmployeeService employeeService;
    private final EmployeeFileRepository employeeFileRepository;
    private final EmployeeRepo employeeRepo;
    // field
    private final EmployeeDetailsService employeeDetailsService;

    // constructor: add the new param and assign
    public EmployeeController(
            @Qualifier("employeeServiceImpl") EmployeeService employeeService,
            EmployeeFileRepository employeeFileRepository,
            EmployeeRepo employeeRepo,
            EmployeeDetailsService employeeDetailsService) {
        this.employeeService = employeeService;
        this.employeeFileRepository = employeeFileRepository;
        this.employeeRepo = employeeRepo;
        this.employeeDetailsService = employeeDetailsService;
    }

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(LocalDate.class, new PropertyEditorSupport() {
            private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            @Override
            public void setAsText(String text) {
                setValue((text == null || text.isBlank()) ? null : LocalDate.parse(text, formatter));
            }
        });

        binder.setAllowedFields(
                // identity
                "employeeid", "EmployeeName", "firstName", "lastName", "employeeCode",
                // core
                "workGroup", "ranked", "project", "jobNumber", "phoneNumber", "supervisor",
                // dates
                "hireDate", "terminationDate", "transferDate", "lastWorkedDate", "birthDate",
                // status & capability
                "employeeStatus", "blackEnergizedWork", "greenTurnOnOff", "redTroubleshoot",
                "aquaCablePulling", "blueTerminations", "goldManagement",
                // IDs & contact
                "xid", "badgeNum", "workEmail", "personalEmail",
                // work location
                "workLocation", "workLocationAddress", "workLocationCity", "workLocationState",
                "workLocationZip", "workLocationCountry",
                // vendor/leased labor
                "leasedLabor", "vendorName", "vendorAddressLine1", "vendorAddressLine2",
                // travel (existing)
                "travelPref", "travelNotes",
                // misc/pay
                "payType", "annualSalary", "lastSource", "lastBatchId",
                // NEW: language & address lines
                "essLanguagePreference", "primaryAddressLine1", "primaryAddressLine2",
                // NEW: onboarding/training JSON
                "trainingLevelOne", "trainingLevelTwo", "trainingLevelThree", "onboardingStatus",
                // NEW: supervisor split
                "supervisorPrimary", "supervisorSecondary",
                // NEW: independent contractor / travel policy
                "independentContractor", "smithTraining", "travelPolicyCc",
                "travelers", "travelAllowance",
                // files
                "filesForEmployee");
    }

    @PostMapping("/login")
    public ResponseEntity<LoginMessage> login(@RequestBody LoginDTO loginDTO) {
        LoginMessage msg = employeeService.loginEmployee(loginDTO);
        return ResponseEntity.status(msg.getStatus() ? HttpStatus.OK : HttpStatus.UNAUTHORIZED).body(msg);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/id/{id}")
    public ResponseEntity<?> deleteEmployee(@PathVariable Integer id, HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped delete"));
        }
        try {
            employeeService.deleteEmployee(id);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message", "Employee not found"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to delete employee"));
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(path = "/save", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE })
    public ResponseEntity<?> saveEmployee(
            @ModelAttribute EmployeeDTO employeeDTO,
            @RequestParam(value = "filesForEmployee", required = false) MultipartFile[] files,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped save"));
        }
        try {
            if (files != null && files.length > 0) {
                employeeDTO.setFilesForEmployee(files[0].getBytes());
            }
            String result = employeeService.addEmployee(employeeDTO);
            return ResponseEntity.ok(Map.of("status", "success", "message", result));
        } catch (Exception e) {
            logger.error("Error saving employee", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to save employee"));
        }
    }

    // JSON variant for smoke/dev (avoids 415 on application/json)
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(path = "/save", consumes = MediaType.APPLICATION_JSON_VALUE, params = "json")
    public ResponseEntity<?> saveEmployeeJson(@RequestBody EmployeeDTO employeeDTO, HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped save"));
        }
        String result = employeeService.addEmployee(employeeDTO);
        return ResponseEntity.ok(Map.of("status", "success", "message", result));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping(value = "/id/{id}", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_JSON_VALUE })
    public ResponseEntity<?> updateEmployee(
            @PathVariable Integer id,
            @ModelAttribute EmployeeDTO dto,
            @RequestParam(value = "filesForEmployee", required = false) List<MultipartFile> files,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped update", "id", id));
        }
        try {
            dto.setEmployeeid(id);
            String result = employeeService.updateEmployee(dto);
            return ResponseEntity.ok(Map.of("status", "ok", "message", result, "id", id));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message", "Employee not found", "details", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating employee id={}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to update employee"));
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping(value = "/id/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, params = "json")
    public ResponseEntity<?> updateEmployeeJson(
            @PathVariable Integer id,
            @RequestBody EmployeeDTO dto,
            HttpServletRequest req) {
        if (com.cec.EmployeeDB.Config.SmokeTestGuard.isSmokeTest(req)) {
            return ResponseEntity.ok(Map.of("status", "smoke", "message", "skipped update", "id", id));
        }
        try {
            dto.setEmployeeid(id);
            String result = employeeService.updateEmployee(dto);
            return ResponseEntity.ok(Map.of("status", "ok", "message", result, "id", id));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message", "Employee not found", "details", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error updating employee id={}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("status", "error", "message", "Failed to update employee"));
        }
    }

    public static record EmployeeListResponse(
            java.util.List<EmployeeDTO> employees,
            java.time.Instant lastSyncedAt) {
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/list")
    public ResponseEntity<EmployeeListResponse> getAllEmployees(
            @RequestParam(value = "status", required = false) String status) {

        // --- try DB-side filtering first if a status is provided ---
        if (status != null && !status.isBlank()) {
            final String want = status.trim().toLowerCase();
            final boolean admin = isAdmin();

            // DB-spec filter
            Specification<Employee> spec = statusSpec(want);

            // sort by the actual entity property, NOT the DTO field
            var entities = employeeRepo.findAll(
                    spec,
                    Sort.by(Sort.Order.asc("displayName").ignoreCase()));

            // If we got anything, map-and-return immediately
            if (!entities.isEmpty()) {
                List<EmployeeDTO> rows = entities.stream()
                        .map(EmployeeController::toDto) // <-- the small mapper we added earlier
                        .filter(Objects::nonNull)
                        .map(dto -> sanitize(dto, admin))
                        .toList();

                var max = employeeService.getMaxUpdatedAt();
                var last = (max == null) ? null
                        : max.atZone(java.time.ZoneId.systemDefault()).toInstant();
                return ResponseEntity.ok(new EmployeeListResponse(rows, last));
            }

            // 🔁 Fallback for tricky data (e.g., empty-string end dates, odd synonyms):
            // Do an in-memory filter using the same normalization the client uses.
            List<EmployeeDTO> all = employeeService.getAllEmployees();
            List<EmployeeDTO> filtered = all.stream()
                    .filter(e -> normStatus(e).equals(want))
                    .map(dto -> sanitize(dto, admin))
                    .toList();

            var max = employeeService.getMaxUpdatedAt();
            var last = (max == null) ? null
                    : max.atZone(java.time.ZoneId.systemDefault()).toInstant();
            return ResponseEntity.ok(new EmployeeListResponse(filtered, last));
        }

        // --- no status param: current behavior (all rows) ---
        boolean admin = isAdmin();
        List<EmployeeDTO> rows = employeeService.getAllEmployees().stream()
                .map(dto -> sanitize(dto, admin))
                .toList();
        var max = employeeService.getMaxUpdatedAt();
        var last = (max == null) ? null
                : max.atZone(java.time.ZoneId.systemDefault()).toInstant();
        return ResponseEntity.ok(new EmployeeListResponse(rows, last));
    }

    private static String normStatus(EmployeeDTO e) {
        String s = Optional.ofNullable(e.getEmployeeStatus()).orElse("").trim().toLowerCase();

        if (e.getTerminationDate() != null)
            return "terminated";
        if (List.of("terminated", "term", "termed", "separated", "fired").contains(s))
            return "terminated";
        if (List.of("inactive", "on leave", "on_leave", "leave").contains(s))
            return "inactive";
        if ("active".equals(s))
            return "active";
        return "other";
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/id/{id}")
    public ResponseEntity<?> patchEmployee(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        if (id == null) {
            throw new EntityNotFoundException("Employee ID cannot be null");
        }
        var e = employeeRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found: " + id));

        if (body.containsKey("terminationDate")) {
            String s = Objects.toString(body.get("terminationDate"), null);
            e.setTerminationDate((s == null || s.isBlank()) ? null : LocalDate.parse(s));
        }
        if (body.containsKey("employeeStatus")) {
            String statusValue = Objects.toString(body.get("employeeStatus"), null);
            if (statusValue != null) {
                e.setEmployeeStatus(statusValue);
            }
        }

        employeeRepo.save(Objects.requireNonNull(e, "employee cannot be null"));
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // in EmployeeController
    @Profile("dev")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/debug/status-counts")
    public Map<String, Long> statusCountsDebug() {
        return employeeService.getAllEmployees().stream()
                .map(EmployeeController::normStatus)
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/id/{id}")
    public ResponseEntity<EmployeeDetailsDTO> getEmployeeById(@PathVariable Integer id) {
        return ResponseEntity.ok(employeeDetailsService.getById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @PostMapping("/filter")
    public List<EmployeeDTO> getEmployeesByCriteria(@RequestBody EmployeeFilterCriteria criteria) {
        boolean admin = isAdmin();
        return employeeService.getEmployeesWithCriteria(criteria).stream()
                .map(dto -> sanitize(dto, admin))
                .toList();
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/{id}/timeline")
    public List<TimelineEventDTO> getTimeline(@PathVariable("id") Long id) {
        return employeeService.getTimeline(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/employees/latest-id")
    public ResponseEntity<?> getLatestEmployeeId() {
        try {
            Integer latestId = Objects.requireNonNull(employeeService.getLatestEmployeeId(), "latestId cannot be null");
            return ResponseEntity.ok(Map.of("latestEmployeeId", latestId));
        } catch (Exception e) {
            logger.error("Failed to fetch latest employee id", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch latest employee id"));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/projects-summary")
    public ResponseEntity<?> getProjectsSummary() {
        return ResponseEntity.ok(employeeService.getProjectsSummary());
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/{id}/files/{fileId}")
    public ResponseEntity<byte[]> download(@PathVariable Integer id, @PathVariable Long fileId) {
        EmployeeFile f = employeeFileRepository
                .findByIdAndEmployeeEmployeeid(fileId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));

        String filename = (f.getFileName() == null || f.getFileName().isBlank())
                ? "file-" + f.getId()
                : f.getFileName().replace("\"", "");
        String contentType = (f.getContentType() != null && !f.getContentType().isBlank())
                ? f.getContentType()
                : "application/octet-stream";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(
                        MediaType.parseMediaType(Objects.requireNonNull(contentType, "contentType cannot be null")))
                .body(f.getBytes());
    }

    // =========================
    // Large-dataset endpoints
    // =========================

    // GET
    // /api/v1/employee/paged?query=&group=&rank=&project=&sort=EmployeeName.asc&page=0&size=50
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/paged")
    public ResponseEntity<Page<Employee>> listPaged(
            @RequestParam(required = false) String query,
            @RequestParam(required = false, name = "group") String group,
            @RequestParam(required = false, name = "rank") String rank,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String status, // NEW
            @RequestParam(defaultValue = "EmployeeName.asc") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        String[] s = sort.split("\\.");
        String sortField = (s.length > 0 && !s[0].isBlank()) ? s[0] : "EmployeeName";
        boolean desc = (s.length == 2 && "desc".equalsIgnoreCase(s[1]));

        Pageable pageable = PageRequest.of(page, size, desc
                ? Sort.by(sortField).descending()
                : Sort.by(sortField).ascending());

        Specification<Employee> spec = Specification.allOf();

        if (query != null && !query.isBlank()) {
            String q = "%" + query.toLowerCase() + "%";
            spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("EmployeeName")), q));
        }
        if (group != null && !group.isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("workGroup"), group));
        }
        if (rank != null && !rank.isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("ranked"), rank));
        }
        if (project != null && !project.isBlank()) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("project"), project));
        }
        if (status != null && !status.isBlank()) { // NEW
            spec = spec.and(statusSpec(status));
        }

        return ResponseEntity.ok(employeeRepo.findAll(spec, pageable));
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/meta")
    public ResponseEntity<Map<String, List<String>>> meta() {
        Map<String, List<String>> m = new HashMap<>();
        m.put("groups", sortList(employeeRepo.findDistinctWorkGroup()));
        m.put("ranks", sortList(employeeRepo.findDistinctRanked()));
        m.put("projects", sortList(employeeRepo.findDistinctProject()));
        return ResponseEntity.ok(m);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping(value = "/export", produces = "text/csv")
    public void exportCsv(
            @RequestParam(required = false) String query,
            @RequestParam(required = false, name = "group") String group,
            @RequestParam(required = false, name = "rank") String rank,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) String status, // NEW
            @RequestParam(defaultValue = "EmployeeName.asc") String sort,
            HttpServletResponse response) throws Exception {
        // ... unchanged headers ...

        String[] s = sort.split("\\.");
        String sortField = (s.length > 0 && !s[0].isBlank()) ? s[0] : "EmployeeName";
        boolean desc = (s.length == 2 && "desc".equalsIgnoreCase(s[1]));

        int page = 0, size = 500;
        var writer = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
        writer.write(Objects.requireNonNull(
                "employeeid,EmployeeName,workGroup,ranked,project,jobNumber,phoneNumber,supervisor\n",
                "header string cannot be null"));

        while (true) {
            Pageable pageable = PageRequest.of(page, size, desc
                    ? Sort.by(sortField).descending()
                    : Sort.by(sortField).ascending());

            Specification<Employee> spec = Specification.allOf();

            if (query != null && !query.isBlank()) {
                String q = "%" + query.toLowerCase() + "%";
                spec = spec.and((root, cq, cb) -> cb.like(cb.lower(root.get("EmployeeName")), q));
            }
            if (group != null && !group.isBlank()) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("workGroup"), group));
            }
            if (rank != null && !rank.isBlank()) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("ranked"), rank));
            }
            if (project != null && !project.isBlank()) {
                spec = spec.and((root, cq, cb) -> cb.equal(root.get("project"), project));
            }
            if (status != null && !status.isBlank()) { // NEW
                spec = spec.and(statusSpec(status));
            }

            Page<Employee> slice = employeeRepo.findAll(spec, pageable);
            for (Employee e : slice.getContent()) {
                writer.write(Objects.requireNonNull(String.format("%s,%s,%s,%s,%s,%s,%s,%s\n",
                        safe(e.getEmployeeid()),
                        csv(e.getDisplayName()),
                        csv(e.getWorkGroup()),
                        csv(e.getRanked()),
                        csv(e.getProject()),
                        csv(e.getJobNumber()),
                        csv(e.getPhoneNumber()),
                        csv(e.getSupervisor())), "formatted string cannot be null"));
            }
            writer.flush();
            if (slice.isLast())
                break;
            page++;
        }
        writer.flush();
    }

    // ---------------- helpers ----------------
    private static boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private static EmployeeDTO sanitize(EmployeeDTO dto, boolean isAdmin) {
        if (dto == null || isAdmin) return dto;
        dto.setPersonalEmail(null);
        dto.setWorkEmail(null);
        dto.setPhoneNumber(null);
        dto.setAnnualSalary(null);
        dto.setBadgeNum(null);
        return dto;
    }

    private static List<String> sortList(List<String> xs) {
        xs.removeIf(Objects::isNull);
        xs.sort(String::compareToIgnoreCase);
        return xs;
    }

    private static EmployeeDTO toDto(Employee e) {
        if (e == null)
            return null;
        EmployeeDTO d = new EmployeeDTO();

        d.setEmployeeid(e.getEmployeeid());
        d.setEmployeeCode(e.getEmployeeCode());
        d.setEmployeeName(e.getDisplayName());
        d.setWorkGroup(e.getWorkGroup());
        d.setRanked(e.getRanked());
        d.setProject(e.getProject());
        d.setJobNumber(e.getJobNumber());
        d.setPhoneNumber(e.getPhoneNumber());
        d.setSupervisor(e.getSupervisor());
        d.setXid(e.getXid());
        d.setBadgeNum(e.getBadgeNum());
        d.setWorkEmail(e.getWorkEmail());
        d.setPersonalEmail(e.getPersonalEmail());
        d.setHireDate(e.getHireDate());
        d.setBirthDate(e.getBirthDate());
        d.setLastWorkedDate(e.getLastWorkedDate());
        d.setTransferDate(e.getTransferDate());
        d.setTerminationDate(e.getTerminationDate());
        d.setTerminationDateCanonical(e.getTerminationDateCanonical());
        d.setWorkLocation(e.getWorkLocation());
        d.setWorkLocationAddress(e.getWorkLocationAddress());
        d.setWorkLocationCity(e.getWorkLocationCity());
        d.setWorkLocationState(e.getWorkLocationState());
        d.setWorkLocationZip(e.getWorkLocationZip());
        d.setWorkLocationCountry(e.getWorkLocationCountry());
        d.setBlackEnergizedWork(e.getBlackEnergizedWork());
        d.setGreenTurnOnOff(e.getGreenTurnOnOff());
        d.setRedTroubleshoot(e.getRedTroubleshoot());
        d.setAquaCablePulling(e.getAquaCablePulling());
        d.setBlueTerminations(e.getBlueTerminations());
        d.setGoldManagement(e.getGoldManagement());
        d.setLeasedLabor(e.isLeasedLabor());
        d.setVendorName(e.getVendorName());
        d.setVendorAddressLine1(e.getVendorAddressLine1());
        d.setVendorAddressLine2(e.getVendorAddressLine2());
        d.setTravelPref(e.getTravelPref());
        d.setTravelNotes(e.getTravelNotes());
        d.setEmployeeStatus(e.getEmployeeStatus());
        d.setPayType(e.getPayType());
        d.setAnnualSalary(e.getAnnualSalary());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        d.setLastSource(e.getLastSource());
        d.setLastBatchId(e.getLastBatchId());

        // **THESE THREE ARE THE IMPORTANT NEW ONES**
        d.setSupervisorPrimary(e.getSupervisorPrimary());
        d.setSupervisorSecondary(e.getSupervisorSecondary());
        d.setRate1(e.getRate1()); // maps column `rate_1` → JSON `rate1`

        return d;
    }

    private static Specification<Employee> statusSpec(String raw) {
        if (raw == null || raw.isBlank())
            return null;
        final String s = raw.trim().toLowerCase();

        final var TERM = List.of("terminated", "term", "termed", "separated", "fired");
        final var INAC = List.of("inactive", "on leave", "on_leave", "leave");

        return (root, cq, cb) -> {
            var statusExpr = cb.lower(cb.coalesce(root.get("employeeStatus"), ""));
            var termNotNull = cb.isNotNull(root.get("terminationDate"));
            var termNull = cb.isNull(root.get("terminationDate"));

            var termPred = orEquals(cb, statusExpr, TERM);
            var inacPred = orEquals(cb, statusExpr, INAC);

            switch (s) {
                case "terminated":
                    return cb.or(termNotNull, termPred);
                case "inactive":
                    return cb.and(termNull, inacPred);
                case "active":
                    return cb.and(termNull, cb.equal(statusExpr, "active"));
                case "other":
                    return cb.and(termNull,
                            cb.not(cb.equal(statusExpr, "active")),
                            cb.not(inacPred),
                            cb.not(termPred));
                default:
                    return cb.equal(statusExpr, s);
            }
        };
    }

    private static jakarta.persistence.criteria.Predicate orEquals(
            jakarta.persistence.criteria.CriteriaBuilder cb,
            jakarta.persistence.criteria.Expression<String> expr,
            List<String> values) {
        jakarta.persistence.criteria.Predicate[] predicates = values.stream()
                .map(v -> cb.equal(expr, v))
                .toArray(jakarta.persistence.criteria.Predicate[]::new);
        return cb.or(predicates);
    }

    private static String safe(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static String csv(String s) {
        if (s == null)
            return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    @PostMapping("/details-by-emp")
    public ResponseEntity<com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse> getEmployeeDetailsByEmpCodes(
            @RequestBody EmpCodeBatchRequest request) {

        List<String> codes = request != null ? request.getEmpCodes() : Collections.emptyList();
        com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse body = employeeService.getEmployeeDetailsByCodes(codes);
        return ResponseEntity.ok(body);
    }
}
