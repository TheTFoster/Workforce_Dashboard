package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Dto.EmployeeDTO;
import com.cec.EmployeeDB.Dto.EmployeeFilterCriteria;
import com.cec.EmployeeDB.Dto.LoginDTO;
import com.cec.EmployeeDB.Dto.TimelineEventDTO;
import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import com.cec.EmployeeDB.Specification.EmployeeSpecification;
import com.cec.EmployeeDB.payloadresponse.LoginMessage;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import java.util.stream.Stream;

@Service
@Primary
public class EmployeeServiceImpl implements EmployeeService {
    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static final Logger logger = LoggerFactory.getLogger(EmployeeServiceImpl.class);
    private final EmployeeRepo employeeRepo;
    private final SupervisorRepository supervisorRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeServiceImpl(SupervisorRepository supervisorRepository, EmployeeRepo employeeRepo,
            PasswordEncoder passwordEncoder) {
        this.supervisorRepository = supervisorRepository;
        this.employeeRepo = employeeRepo;
        this.passwordEncoder = passwordEncoder;
    }

    // ---------------------- helpers ----------------------
    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    // keep
    private static String pick(String a, String b) {
        return (a != null && !a.isBlank()) ? a : b;
    }

    // OPTIONAL but recommended (handles non-String picks elsewhere)
    private static <T> T pick(T a, T b) {
        return a != null ? a : b;
    }

    // keep
    private static <T> T nvl(T a, T b) {
        return a != null ? a : b;
    }

    // --- add these overloads to help the compiler with common boxed types ---
    private static BigDecimal nvl(BigDecimal a, BigDecimal b) {
        return a != null ? a : b;
    }

    private static LocalDate nvl(LocalDate a, LocalDate b) {
        return a != null ? a : b;
    }

    private String constructEmployeeName(String firstName, String lastName, String employeeCode) {
        return Stream.of(
                Optional.ofNullable(firstName).orElse(""),
                Optional.ofNullable(lastName).orElse(""),
                Optional.ofNullable(employeeCode).orElse("")).filter(value -> !value.isBlank())
                .collect(Collectors.joining(" "))
                .trim();
    }

    @SuppressWarnings("unused")
    private boolean isBCryptPassword(String password) {
        return password != null
                && (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$"));
    }

    // ---------------------- dynamic filters ----------------------
    public List<EmployeeDTO> getEmployeesWithCustomCriteria(Map<String, Object> filters) {
        Specification<Employee> specification = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            filters.forEach((key, value) -> {
                if (value instanceof String str) {
                    predicates.add(builder.like(root.get(key), "%" + str + "%"));
                } else if (value instanceof Float f) {
                    predicates.add(builder.equal(root.get(key), f));
                } else if (value instanceof Boolean b) { // NEW
                    predicates.add(builder.equal(root.get(key), b));
                } else if (value instanceof List<?> list) {
                    predicates.add(root.get(key).in(list));
                }
            });

            return builder.and(predicates.toArray(new Predicate[0]));
        };
        return employeeRepo.findAll(specification).stream()
                .map(this::mapToEmployeeDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Page<EmployeeDTO> getEmployeesWithCustomCriteria(Map<String, Object> filters, Pageable pageable) {
        Specification<Employee> specification = (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            filters.forEach((key, value) -> {
                if (value instanceof String str) {
                    predicates.add(builder.like(root.get(key), "%" + str + "%"));
                } else if (value instanceof Float f) {
                    predicates.add(builder.equal(root.get(key), f));
                } else if (value instanceof Boolean b) { // NEW
                    predicates.add(builder.equal(root.get(key), b));
                } else if (value instanceof List<?> list) {
                    predicates.add(root.get(key).in(list));
                }
            });
            return builder.and(predicates.toArray(new Predicate[0]));
        };

        return employeeRepo.findAll(specification, Objects.requireNonNull(pageable, "pageable cannot be null"))
                .map(this::mapToEmployeeDTO);
    }

    // ---------------------- create ----------------------
    @Override
    public String addEmployee(EmployeeDTO employeeDTO) {
        try {
            // minimal required validations that match current DTO
            if (employeeDTO.getFirstName() == null || employeeDTO.getFirstName().isBlank())
                throw new IllegalArgumentException("First name cannot be null or blank.");
            if (employeeDTO.getLastName() == null || employeeDTO.getLastName().isBlank())
                throw new IllegalArgumentException("Last name cannot be null or blank.");
            if (employeeDTO.getEmployeeCode() == null || employeeDTO.getEmployeeCode().isBlank())
                throw new IllegalArgumentException("Employee code cannot be null or blank.");

            Employee employee = new Employee();

            // Name + code
            employee.setDisplayName(
                    constructEmployeeName(employeeDTO.getFirstName(), employeeDTO.getLastName(),
                            employeeDTO.getEmployeeCode()));
            logger.info("Successfully added employee: {}", employee.getDisplayName());

            // Core
            employee.setWorkGroup(employeeDTO.getWorkGroup());
            employee.setRanked(employeeDTO.getRanked());
            employee.setProject(employeeDTO.getProject());
            employee.setJobNumber(employeeDTO.getJobNumber());
            employee.setPhoneNumber(employeeDTO.getPhoneNumber());
            employee.setSupervisor(employeeDTO.getSupervisor());
            employee.setEmployeeStatus(employeeDTO.getEmployeeStatus());

            // Dates (use canonical names you already expose in controller/DTO)
            employee.setHireDate(employeeDTO.getHireDate());
            employee.setLastWorkedDate(employeeDTO.getLastWorkedDate());
            employee.setTransferDate(employeeDTO.getTransferDate());
            employee.setTerminationDate(employeeDTO.getTerminationDate());
            employee.setBirthDate(employeeDTO.getBirthDate());

            // Capability flags
            employee.setBlackEnergizedWork(employeeDTO.getBlackEnergizedWork());
            employee.setGreenTurnOnOff(employeeDTO.getGreenTurnOnOff());
            employee.setRedTroubleshoot(employeeDTO.getRedTroubleshoot());
            employee.setAquaCablePulling(employeeDTO.getAquaCablePulling());
            employee.setBlueTerminations(employeeDTO.getBlueTerminations());
            employee.setGoldManagement(employeeDTO.getGoldManagement());

            // IDs & contact
            employee.setXid(employeeDTO.getXid());
            employee.setBadgeNum(employeeDTO.getBadgeNum());
            employee.setWorkEmail(employeeDTO.getWorkEmail());
            employee.setPersonalEmail(employeeDTO.getPersonalEmail());

            // Work location
            employee.setWorkLocation(employeeDTO.getWorkLocation());
            employee.setWorkLocationAddress(employeeDTO.getWorkLocationAddress());
            employee.setWorkLocationCity(employeeDTO.getWorkLocationCity());
            employee.setWorkLocationState(employeeDTO.getWorkLocationState());
            employee.setWorkLocationZip(employeeDTO.getWorkLocationZip());
            employee.setWorkLocationCountry(employeeDTO.getWorkLocationCountry());

            // Leased labor / vendor
            boolean leased = inferLeased(employeeDTO.getLeasedLabor(), employeeDTO.getWorkLocation(),
                    employeeDTO.getWorkGroup());
            employee.setLeasedLabor(leased);
            // keep this simple: only take explicit vendor fields from DTO
            employee.setVendorName(employeeDTO.getVendorName());
            employee.setVendorAddressLine1(employeeDTO.getVendorAddressLine1());
            employee.setVendorAddressLine2(employeeDTO.getVendorAddressLine2());

            // Travel
            employee.setTravelPref(employeeDTO.getTravelPref());
            employee.setTravelNotes(employeeDTO.getTravelNotes());

            // Pay / meta
            employee.setPayType(employeeDTO.getPayType());
            employee.setAnnualSalary(employeeDTO.getAnnualSalary());
            employee.setLastSource(employeeDTO.getLastSource());
            employee.setLastBatchId(employeeDTO.getLastBatchId());

            // DO NOT call employee.setFilesForEmployee(...) here; files are handled by
            // EmployeeFile* flows.
            employeeRepo.save(employee);
            logger.info("Successfully added employee: {}", employee.getDisplayName());
            return "Employee added successfully";
        } catch (IllegalArgumentException e) {
            logger.error("Validation error: {}", e.getMessage());
            return "Validation error: " + e.getMessage();
        } catch (Exception e) {
            logger.error("Failed to add employee: {}", e.getMessage(), e);
            return "Failed to add employee due to unexpected error";
        }
    }

    // ---------------------- criteria ----------------------
    @Override
    public List<EmployeeDTO> getEmployeesWithCriteria(EmployeeFilterCriteria criteria) {
        Specification<Employee> specification = EmployeeSpecification.getEmployeesWithCriteria(criteria);
        List<Employee> employees = employeeRepo.findAll(specification);
        return employees.stream().map(this::mapToEmployeeDTO).collect(Collectors.toList());
    }

    @Override
    public Optional<EmployeeDTO> findByEmployeeId(Integer employeeid) {
        return employeeRepo.findById(Objects.requireNonNull(employeeid, "employeeid cannot be null"))
                .map(this::mapToEmployeeDTO);
    }

    @Override
    public List<Map<String, Object>> getProjectsSummary() {
        List<EmployeeRepo.ProjectSummaryRow> results = employeeRepo.findProjectsSummary();
        List<Map<String, Object>> projectSummary = new ArrayList<>();
        for (EmployeeRepo.ProjectSummaryRow row : results) {
            Map<String, Object> projectData = new HashMap<>();
            projectData.put("project", row.getProject());
            projectData.put("employeeCount", row.getEmployeeCount());
            projectSummary.add(projectData);
        }
        return projectSummary;
    }

    // ---------------------- update ----------------------
    @Override
    public String updateEmployee(EmployeeDTO employeeDTO) {
        if (employeeDTO == null || employeeDTO.getEmployeeid() == null) {
            throw new IllegalArgumentException("Employee ID is required for update");
        }
        Employee e = employeeRepo
                .findById(Objects.requireNonNull(employeeDTO.getEmployeeid(), "employeeid cannot be null"))
                .orElseThrow(() -> new EntityNotFoundException("Employee not found: " + employeeDTO.getEmployeeid()));

        // Identity
        e.setDisplayName(pick(employeeDTO.getEmployeeName(), e.getDisplayName()));

        e.setEmployeeCode(pick(employeeDTO.getEmployeeCode(), e.getEmployeeCode())); // drop *New concept

        // Core
        e.setWorkGroup(pick(employeeDTO.getWorkGroup(), e.getWorkGroup()));
        e.setEmployeeStatus(pick(employeeDTO.getEmployeeStatus(), e.getEmployeeStatus()));
        e.setProject(pick(employeeDTO.getProject(), e.getProject()));
        e.setJobNumber(pick(employeeDTO.getJobNumber(), e.getJobNumber()));
        e.setRanked(pick(employeeDTO.getRanked(), e.getRanked()));
        e.setPhoneNumber(pick(employeeDTO.getPhoneNumber(), e.getPhoneNumber()));
        e.setSupervisor(pick(employeeDTO.getSupervisor(), e.getSupervisor()));
        e.setEmployeeStatus(pick(employeeDTO.getEmployeeStatus(), e.getEmployeeStatus()));

        // Dates (canonical names)
        e.setHireDate(nvl(employeeDTO.getHireDate(), e.getHireDate()));
        e.setLastWorkedDate(nvl(employeeDTO.getLastWorkedDate(), e.getLastWorkedDate()));
        e.setTransferDate(nvl(employeeDTO.getTransferDate(), e.getTransferDate()));
        e.setTerminationDate(nvl(employeeDTO.getTerminationDate(), e.getTerminationDate()));
        e.setBirthDate(nvl(employeeDTO.getBirthDate(), e.getBirthDate()));

        // Capability flags
        e.setBlackEnergizedWork(nvl(employeeDTO.getBlackEnergizedWork(), e.getBlackEnergizedWork()));
        e.setGreenTurnOnOff(nvl(employeeDTO.getGreenTurnOnOff(), e.getGreenTurnOnOff()));
        e.setRedTroubleshoot(nvl(employeeDTO.getRedTroubleshoot(), e.getRedTroubleshoot()));
        e.setAquaCablePulling(nvl(employeeDTO.getAquaCablePulling(), e.getAquaCablePulling()));
        e.setBlueTerminations(nvl(employeeDTO.getBlueTerminations(), e.getBlueTerminations()));
        e.setGoldManagement(nvl(employeeDTO.getGoldManagement(), e.getGoldManagement()));

        // IDs & contact
        e.setXid(pick(employeeDTO.getXid(), e.getXid()));
        e.setBadgeNum(pick(employeeDTO.getBadgeNum(), e.getBadgeNum()));
        e.setWorkEmail(pick(employeeDTO.getWorkEmail(), e.getWorkEmail()));
        e.setPersonalEmail(pick(employeeDTO.getPersonalEmail(), e.getPersonalEmail()));

        // Work location
        e.setWorkLocation(pick(employeeDTO.getWorkLocation(), e.getWorkLocation()));
        e.setWorkLocationAddress(pick(employeeDTO.getWorkLocationAddress(), e.getWorkLocationAddress()));
        e.setWorkLocationCity(pick(employeeDTO.getWorkLocationCity(), e.getWorkLocationCity()));
        e.setWorkLocationState(pick(employeeDTO.getWorkLocationState(), e.getWorkLocationState()));
        e.setWorkLocationZip(pick(employeeDTO.getWorkLocationZip(), e.getWorkLocationZip()));
        e.setWorkLocationCountry(pick(employeeDTO.getWorkLocationCountry(), e.getWorkLocationCountry()));

        // Leased labor / vendor
        boolean leasedU = inferLeased(employeeDTO.getLeasedLabor(), e.getWorkLocation(), e.getWorkGroup());
        e.setLeasedLabor(leasedU);
        e.setVendorName(pick(employeeDTO.getVendorName(), e.getVendorName()));
        e.setVendorAddressLine1(pick(employeeDTO.getVendorAddressLine1(), e.getVendorAddressLine1()));
        e.setVendorAddressLine2(pick(employeeDTO.getVendorAddressLine2(), e.getVendorAddressLine2()));

        // Travel
        e.setTravelPref(pick(employeeDTO.getTravelPref(), e.getTravelPref()));
        e.setTravelNotes(pick(employeeDTO.getTravelNotes(), e.getTravelNotes()));

        // Pay / meta
        e.setPayType(pick(employeeDTO.getPayType(), e.getPayType()));
        e.setAnnualSalary(nvl(employeeDTO.getAnnualSalary(), e.getAnnualSalary()));
        e.setLastSource(pick(employeeDTO.getLastSource(), e.getLastSource()));
        e.setLastBatchId(pick(employeeDTO.getLastBatchId(), e.getLastBatchId()));

        employeeRepo.save(e);
        return "Employee updated successfully";
    }

    // ---------------------- auth ----------------------
    @Override
    public LoginMessage loginEmployee(LoginDTO loginDTO) {
        if (loginDTO == null || loginDTO.getEmployeeCode() == null || loginDTO.getEmployeeCode().isBlank()) {
            return new LoginMessage("EmployeeCode is required", false);
        }

        final String code = loginDTO.getEmployeeCode().trim();
        final String raw = loginDTO.getPassword() == null ? "" : loginDTO.getPassword();

        var opt = supervisorRepository.findByEmployeeCode(code)
                .or(() -> supervisorRepository.findByEmployeeCodeIgnoreCase(code));

        if (opt.isEmpty()) {
            return new LoginMessage("Incorrect EmployeeCode and Password", false);
        }

        var supervisor = opt.get();
        var stored = supervisor.getPassword();
        if (stored == null || stored.isBlank()) {
            return new LoginMessage("Incorrect EmployeeCode and Password", false);
        }

        if (passwordEncoder.matches(raw, stored)) {
            LoginMessage lm = new LoginMessage("Login Success", true);
            if (supervisor.getMustChangePassword() != null && supervisor.getMustChangePassword()) {
                lm.setMustChangePassword(true);
            } else if (!isStrongPassword(raw)) {
                lm.setMustChangePassword(true);
                lm.setMessage("Password is too weak, please reset it.");
            }
            return lm;
        }

        return new LoginMessage("Incorrect EmployeeCode and Password", false);
    }

    private static boolean isStrongPassword(String password) {
        if (password == null || password.length() < 12) return false;
        int classes = 0;
        if (password.chars().anyMatch(Character::isUpperCase)) classes++;
        if (password.chars().anyMatch(Character::isLowerCase)) classes++;
        if (password.chars().anyMatch(Character::isDigit)) classes++;
        if (password.chars().anyMatch(ch -> "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~".indexOf(ch) >= 0)) classes++;
        return classes >= 3;
    }

    // ---------------------- CRUD + queries ----------------------
    @Override
    public void deleteEmployee(Integer employeeId) {
        if (employeeId == null)
            throw new IllegalArgumentException("employeeId is required");
        if (!employeeRepo.existsById(employeeId))
            throw new EntityNotFoundException("Employee not found: " + employeeId);
        employeeRepo.deleteById(employeeId);
    }

    @Override
    public List<EmployeeDTO> getAllEmployees() {
        return employeeRepo.findAll().stream().map(this::mapToEmployeeDTO).collect(Collectors.toList());
    }

    public Page<EmployeeDTO> getAllEmployees(Pageable pageable) {
        return employeeRepo.findAll(Objects.requireNonNull(pageable, "pageable cannot be null"))
                .map(this::mapToEmployeeDTO);
    }

    @Override
    public Integer getLatestEmployeeId() {
        return employeeRepo.findTopByOrderByIdDesc()
                .map(Employee::getEmployeeid)
                .orElse(0);
    }

    public Integer getNextEmployeeId() {
        Integer maxId = employeeRepo.findMaxEmpId();
        return maxId == null ? 1 : maxId + 1;
    }

    @Override
    public List<EmployeeDTO> getEmployeesByStatus(String status) {
        List<EmployeeDTO> all = getAllEmployees();

        final String s = (status == null) ? "" : status.trim().toLowerCase();
        final Set<String> TERM = Set.of("terminated", "term", "termed", "separated", "fired");
        final Set<String> INAC = Set.of("inactive", "on leave", "on_leave", "leave");

        return all.stream()
                .filter(dto -> {
                    String raw = Optional.ofNullable(dto.getEmployeeStatus()).orElse("").trim().toLowerCase();
                    boolean hasTerm = dto.getTerminationDate() != null; // ← use canonical

                    switch (s) {
                        case "terminated":
                            return hasTerm || TERM.contains(raw);
                        case "inactive":
                            return !hasTerm && INAC.contains(raw);
                        case "active":
                            return !hasTerm && "active".equals(raw);
                        case "other":
                            return !hasTerm && !"active".equals(raw) && !INAC.contains(raw) && !TERM.contains(raw);
                        default:
                            return raw.equals(s);
                    }
                })
                .sorted(Comparator.comparing(e -> Optional.ofNullable(e.getEmployeeName()).orElse(""),
                        String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    // ---------------------- mapping ----------------------
    private EmployeeDTO mapToEmployeeDTO(Employee employee) {
        EmployeeDTO dto = new EmployeeDTO();
        dto.setEmployeeid(employee.getEmployeeid());

        // Name decomposition (best-effort)
        String full = employee.getDisplayName() == null ? "" : employee.getDisplayName();
        String[] parts = full.split(" ");
        dto.setFirstName(parts.length > 0 ? parts[0] : null);
        dto.setLastName(parts.length > 1 ? parts[1] : null);
        dto.setEmployeeName(employee.getDisplayName());

        // Core
        dto.setWorkGroup(employee.getWorkGroup());
        dto.setProject(employee.getProject());
        dto.setJobNumber(employee.getJobNumber());
        dto.setEmployeeCode(employee.getEmployeeCode());
        dto.setRanked(employee.getRanked());
        dto.setPhoneNumber(employee.getPhoneNumber());
        dto.setSupervisor(employee.getSupervisor());
        dto.setEmployeeStatus(employee.getEmployeeStatus()); // use canonical status

        // Capability flags
        dto.setBlackEnergizedWork(employee.getBlackEnergizedWork());
        dto.setGreenTurnOnOff(employee.getGreenTurnOnOff());
        dto.setRedTroubleshoot(employee.getRedTroubleshoot());
        dto.setAquaCablePulling(employee.getAquaCablePulling());
        dto.setBlueTerminations(employee.getBlueTerminations());
        dto.setGoldManagement(employee.getGoldManagement());

        // IDs & contact
        dto.setXid(employee.getXid());
        dto.setBadgeNum(employee.getBadgeNum());
        dto.setWorkEmail(employee.getWorkEmail());
        dto.setPersonalEmail(employee.getPersonalEmail());

        // Dates
        dto.setHireDate(employee.getHireDate());
        dto.setBirthDate(employee.getBirthDate());
        dto.setLastWorkedDate(employee.getLastWorkedDate());
        dto.setTransferDate(employee.getTransferDate());
        dto.setTerminationDate(employee.getTerminationDate());

        // Work location
        dto.setWorkLocation(employee.getWorkLocation());
        dto.setWorkLocationAddress(employee.getWorkLocationAddress());
        dto.setWorkLocationCity(employee.getWorkLocationCity());
        dto.setWorkLocationState(employee.getWorkLocationState());
        dto.setWorkLocationZip(employee.getWorkLocationZip());
        dto.setWorkLocationCountry(employee.getWorkLocationCountry());

        // Leased labor / vendor
        dto.setLeasedLabor(employee.isLeasedLabor());
        dto.setVendorName(employee.getVendorName());
        dto.setVendorAddressLine1(employee.getVendorAddressLine1());
        dto.setVendorAddressLine2(employee.getVendorAddressLine2());

        // Travel
        dto.setTravelPref(employee.getTravelPref());
        dto.setTravelNotes(employee.getTravelNotes());

        // Pay / meta
        dto.setPayType(employee.getPayType());
        dto.setAnnualSalary(employee.getAnnualSalary());
        dto.setLastSource(employee.getLastSource());
        dto.setLastBatchId(employee.getLastBatchId());

        // Read-only / audit
        dto.setCreatedAt(employee.getCreatedAt());
        dto.setUpdatedAt(employee.getUpdatedAt());

        // Normalized IDs exposed by DB
        dto.setPersonXidNorm(employee.getPersonXidNorm());
        dto.setBadgeNumNorm(employee.getBadgeNumNorm());

        // Additional IDs / alternate codes
        dto.setEmployeeCodeNew(employee.getEmployeeCodeNew());

        // Pay/position date tracking
        dto.setLastPayChange(employee.getLastPayChange());
        dto.setLastPositionChangeDate(employee.getLastPositionChangeDate());
        dto.setMostRecentHireDate(employee.getMostRecentHireDate());

        // Rehire / leave / termination meta
        dto.setRehireDate(employee.getRehireDate());
        dto.setLeaveStart(employee.getLeaveStart());
        dto.setLeaveEnd(employee.getLeaveEnd());
        dto.setPreviousTerminationDate(employee.getPreviousTerminationDate());

        // Device / verify fields
        dto.setIpad(employee.getIpad());
        dto.setLaptop(employee.getLaptop());

        // Extra termination dates / verify
        dto.setTerminationDate1(employee.getTerminationDate1());
        dto.setTerminationDate2(employee.getTerminationDate2());
        dto.setEmployeeVerify(employee.getEmployeeVerify());

        // Start / end
        dto.setStartDate(employee.getStartDate());
        dto.setEndDate(employee.getEndDate());

        // Titles / org
        dto.setBusinessTitle(employee.getBusinessTitle());
        dto.setPositionTitle(employee.getPositionTitle());
        dto.setPositionType(employee.getPositionType());
        dto.setTimeInPosition(employee.getTimeInPosition());
        dto.setManagerLevel(employee.getManagerLevel());
        dto.setDepartmentDesc(employee.getDepartmentDesc());
        dto.setSubDepartmentDesc(employee.getSubDepartmentDesc());

        // Time zone
        dto.setTimeZoneCode(employee.getTimeZoneCode());
        dto.setTimeZoneDescription(employee.getTimeZoneDescription());

        // Job / GWA
        dto.setJobDesc(employee.getJobDesc());
        dto.setGwaTagNum(employee.getGwaTagNum());

        // Transfer pointers
        dto.setTransferTo(employee.getTransferTo());
        dto.setTransferToDate(employee.getTransferToDate());

        // Hourly pay
        dto.setRate1(employee.getRate1());

        // Driver license
        dto.setCarLicenseNum(employee.getCarLicenseNum());
        dto.setLicenseType(employee.getLicenseType());
        dto.setLicenseExpiration(employee.getLicenseExpiration());

        // Supervisor split
        dto.setSupervisorPrimary(employee.getSupervisorPrimary());
        dto.setSupervisorSecondary(employee.getSupervisorSecondary());

        // Language / contractor / training
        dto.setEssLanguagePreference(employee.getEssLanguagePreference());
        dto.setIndependentContractor(employee.getIndependentContractor());
        dto.setSmithTraining(employee.getSmithTraining());
        dto.setTravelPolicyCc(employee.getTravelPolicyCc());
        dto.setTravelers(employee.getTravelers());
        dto.setTravelAllowance(employee.getTravelAllowance());

        // Scores / safety
        dto.setEvaluationScore(employee.getEvaluationScore());
        dto.setOsha10(employee.getOsha10());
        dto.setOsha30(employee.getOsha30());

        // Names / preferred
        dto.setPreferredFirstName(employee.getPreferredFirstName());
        dto.setNickname(employee.getNickname());

        // Primary address lines
        dto.setPrimaryAddressLine1(employee.getPrimaryAddressLine1());
        dto.setPrimaryAddressLine2(employee.getPrimaryAddressLine2());

        // Training / onboarding
        dto.setTrainingLevelOne(employee.getTrainingLevelOne());
        dto.setTrainingLevelTwo(employee.getTrainingLevelTwo());
        dto.setTrainingLevelThree(employee.getTrainingLevelThree());
        dto.setOnboardingStatus(employee.getOnboardingStatus());

        // Transient / view-backed fields
        dto.setLastWorkDate(employee.getLastWorkDate());
        dto.setLastJobCode(employee.getLastJobCode());
        dto.setLastJobDesc(employee.getLastJobDesc());
        dto.setTransferEffectiveDate(employee.getTransferEffectiveDate());
        dto.setTerminationLatest(employee.getTerminationLatest());
        dto.setEndDateResolved(employee.getEndDateResolved());

        return dto;
    }

    @Override
    public EmployeeDTO getEmployeeById(Integer employeeid) {
        return employeeRepo.findById(Objects.requireNonNull(employeeid, "employeeid cannot be null"))
                .map(this::mapToEmployeeDTO).orElse(null);
    }

    // Additional query helpers
    public List<EmployeeDTO> findByStartDateBetween(LocalDate start, LocalDate end) {
        return employeeRepo.findByStartDateBetween(start, end).stream().map(this::mapToEmployeeDTO)
                .collect(Collectors.toList());
    }

    public List<EmployeeDTO> findByWorkGroup(String workGroup) {
        return employeeRepo.findByWorkGroup(workGroup).stream().map(this::mapToEmployeeDTO)
                .collect(Collectors.toList());
    }

    @Override
    public long countBySupervisor(String supervisor) {
        return employeeRepo.countBySupervisor(supervisor);
    }

    public List<EmployeeDTO> findByEndDateIsNull() {
        return employeeRepo.findByEndDateIsNull().stream().map(this::mapToEmployeeDTO).collect(Collectors.toList());
    }

    public List<EmployeeDTO> findByRanked(String ranked) {
        return employeeRepo.findByRanked(ranked).stream().map(this::mapToEmployeeDTO).collect(Collectors.toList());
    }

    public List<EmployeeDTO> findByEmployeeNameContainingIgnoreCase(String name) {
        return employeeRepo.findByDisplayNameContainingIgnoreCase(name)
                .stream().map(this::mapToEmployeeDTO).collect(Collectors.toList());
    }

    @Override
    public long countByWorkGroup(String workGroup) {
        if (!hasText(workGroup))
            return 0L;
        return employeeRepo.countByWorkGroup(workGroup);
    }

    @Override
    public List<EmployeeDTO> getEmployeesByProject(String project, boolean activeOnly) {
        List<Employee> rows = activeOnly
                ? employeeRepo.findByProjectAndEmployeeVerifyOrderByEmployeeNameAsc(project, "Active")
                : employeeRepo.findByProjectOrderByEmployeeNameAsc(project);

        return rows.stream().map(e -> {
            EmployeeDTO dto = new EmployeeDTO();
            dto.setEmployeeid(e.getEmployeeid());
            dto.setEmployeeName(e.getDisplayName());
            dto.setEmployeeCode(e.getEmployeeCode());
            dto.setWorkGroup(e.getWorkGroup());
            dto.setRanked(e.getRanked());
            return dto;
        }).toList();
    }

    @Override
    public List<EmployeeDTO> getEmployeesByGroup(String group, boolean activeOnly) {
        List<Employee> rows = activeOnly
                ? employeeRepo.findByWorkGroupAndEmployeeVerifyOrderByEmployeeNameAsc(group, "Active")
                : employeeRepo.findByWorkGroupOrderByEmployeeNameAsc(group);

        return rows.stream().map(e -> {
            EmployeeDTO dto = new EmployeeDTO();
            dto.setEmployeeid(e.getEmployeeid());
            dto.setEmployeeName(e.getDisplayName());
            dto.setEmployeeCode(e.getEmployeeCode());
            dto.setRanked(e.getRanked());
            return dto;
        }).toList();
    }

    @Override
    public List<EmployeeDTO> getEmployeesByJobNumber(String jobNumber, boolean activeOnly) {
        List<Employee> rows = activeOnly
                ? employeeRepo.findByJobNumberAndEmployeeVerifyOrderByEmployeeNameAsc(jobNumber, "Active")
                : employeeRepo.findByJobNumberOrderByEmployeeNameAsc(jobNumber);

        return rows.stream().map(e -> {
            EmployeeDTO dto = new EmployeeDTO();
            dto.setEmployeeid(e.getEmployeeid());
            dto.setEmployeeName(e.getDisplayName());
            dto.setEmployeeCode(e.getEmployeeCode());
            dto.setRanked(e.getRanked());
            return dto;
        }).toList();
    }

    @Override
    public LocalDateTime getMaxUpdatedAt() {
        return employeeRepo.findMaxUpdatedAt();
    }

    // ---------------------- timeline ----------------------
    @Override
    public List<TimelineEventDTO> getTimeline(Long empId) {
        // ensure the employee exists (nice error for UI)
        employeeRepo.findById(Objects.requireNonNull(empId.intValue(), "empId cannot be null"))
                .orElseThrow(() -> new EntityNotFoundException("Employee not found: " + empId));

        List<EmployeeRepo.TimelineEventProjection> rows = employeeRepo.findTimeline(empId);
        return rows.stream()
                .map(p -> new TimelineEventDTO(p.getEventType(), p.getEventDate()))
                .collect(Collectors.toList());
    }

    private static boolean inferLeased(Boolean explicit, String workLocation, String departmentDesc) {
        if (explicit != null)
            return explicit.booleanValue();
        final String wl = nz(workLocation).trim().toLowerCase();
        final String dept = nz(departmentDesc).trim().toLowerCase();
        return "cec temp employees".equals(wl) || "leased labor".equals(dept);
    }

    @Override
    public com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse getEmployeeDetailsByCodes(List<String> empCodes) {
        if (empCodes == null || empCodes.isEmpty()) {
            return new com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse(Collections.emptyMap(), Collections.emptyList());
        }

        // Normalize like the front-end (trim + upper) and preserve input order
        List<String> normalizedList = new ArrayList<>();
        Set<String> normalized = new HashSet<>();
        for (String raw : empCodes) {
            if (raw == null) continue;
            String s = raw.trim();
            if (s.isEmpty()) continue;
            String k = s.toUpperCase();
            if (!normalized.contains(k)) {
                normalized.add(k);
                normalizedList.add(k);
            }
        }

        if (normalized.isEmpty()) {
            return new com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse(Collections.emptyMap(), Collections.emptyList());
        }

        // Approach:
        // 1) Lookup by employee_code IN (indexed, efficient)
        // 2) For any requested codes not matched, fall back to findByAnyIdentifier(code)
        // 3) Map matched employees to the normalized input keys
        Map<String, EmployeeDTO> result = new HashMap<>();
        Set<Integer> seenEmpIds = new HashSet<>();

        List<Employee> primaryMatches = employeeRepo.findByEmployeeCodeIn(normalized);
        for (Employee e : primaryMatches) {
            if (e == null || e.getEmployeeid() == null) continue;
            EmployeeDTO dto = mapToEmployeeDTO(e);
            dto.setSupervisorPrimary(e.getSupervisorPrimary());
            dto.setSupervisorSecondary(e.getSupervisorSecondary());
            if (dto.getSupervisor() == null || dto.getSupervisor().isBlank()) {
                String sup = Optional.ofNullable(e.getSupervisorPrimary()).filter(s -> !s.isBlank())
                        .orElse(e.getSupervisor());
                dto.setSupervisor(sup);
            }
            dto.setRate1(e.getRate1());
            dto.setPayType(e.getPayType());
            dto.setTimeInPosition(e.getTimeInPosition());

            seenEmpIds.add(e.getEmployeeid());

            // Map any identifier variants to this DTO if requested
            List<String> ids = Arrays.asList(e.getEmployeeCode(), e.getEmployeeCodeNew(), e.getXid(), e.getTixid(), e.getBadgeNum(), e.getBadgeNumNorm());
            boolean mapped = false;
            for (String idv : ids) {
                if (idv == null) continue;
                String k = idv.trim().toUpperCase();
                if (k.isEmpty()) continue;
                if (normalized.contains(k)) {
                    // set canonical key on the dto for clarity
                    dto.setCanonicalKey(Optional.ofNullable(e.getEmployeeCode()).map(String::trim).map(String::toUpperCase).orElse(null));
                    result.put(k, dto);
                    mapped = true;
                }
            }
            if (!mapped && e.getEmployeeCode() != null && !e.getEmployeeCode().isBlank()) {
                dto.setCanonicalKey(Optional.ofNullable(e.getEmployeeCode()).map(String::trim).map(String::toUpperCase).orElse(null));
                result.put(e.getEmployeeCode().trim().toUpperCase(), dto);
            }
        }

        // Fallback for remaining requested codes
        Set<String> remaining = new HashSet<>(normalized);
        remaining.removeAll(result.keySet());
        for (String code : remaining) {
            try {
                Optional<Employee> oe = employeeRepo.findByAnyIdentifier(code);
                if (oe.isEmpty()) continue;
                Employee e = oe.get();
                if (e == null || e.getEmployeeid() == null) continue;
                if (seenEmpIds.contains(e.getEmployeeid())) {
                    // link the requested code to the existing DTO
                    for (Map.Entry<String, EmployeeDTO> en : result.entrySet()) {
                        EmployeeDTO v = en.getValue();
                        if (v.getEmployeeid() != null && v.getEmployeeid().equals(e.getEmployeeid())) {
                            result.put(code, v);
                            break;
                        }
                    }
                    continue;
                }

                EmployeeDTO dto = mapToEmployeeDTO(e);
                dto.setSupervisorPrimary(e.getSupervisorPrimary());
                dto.setSupervisorSecondary(e.getSupervisorSecondary());
                if (dto.getSupervisor() == null || dto.getSupervisor().isBlank()) {
                    String sup = Optional.ofNullable(e.getSupervisorPrimary()).filter(s -> !s.isBlank())
                            .orElse(e.getSupervisor());
                    dto.setSupervisor(sup);
                }
                dto.setRate1(e.getRate1());
                dto.setPayType(e.getPayType());
                dto.setTimeInPosition(e.getTimeInPosition());

                seenEmpIds.add(e.getEmployeeid());

                List<String> ids = Arrays.asList(e.getEmployeeCode(), e.getEmployeeCodeNew(), e.getXid(), e.getTixid(), e.getBadgeNum(), e.getBadgeNumNorm());
                boolean mappedAny = false;
                for (String idv : ids) {
                    if (idv == null) continue;
                    String k = idv.trim().toUpperCase();
                    if (k.isEmpty()) continue;
                    if (normalized.contains(k)) {
                        result.put(k, dto);
                        mappedAny = true;
                    }
                }
                if (!mappedAny) {
                    dto.setCanonicalKey(Optional.ofNullable(e.getEmployeeCode()).map(String::trim).map(String::toUpperCase).orElse(null));
                    result.put(code, dto);
                }
            } catch (Exception ex) {
                logger.warn("getEmployeeDetailsByCodes - fallback lookup failed for {}: {}", code, ex.getMessage());
            }
        }

        // Build final ordered map keyed by the normalized request keys so the client can
        // deterministically look up by what it asked for.
        Map<String, EmployeeDTO> finalMap = new LinkedHashMap<>();
        List<String> unmatched = new ArrayList<>();
        int matchedCount = 0;
        for (String req : normalizedList) {
            EmployeeDTO dto = result.get(req);
            finalMap.put(req, dto);
            if (dto != null) matchedCount++;
            else unmatched.add(req);
        }

        logger.info(
                "getEmployeeDetailsByCodes: requested={}, normalized={}, matched={}",
                empCodes.size(), normalized.size(), matchedCount);

        // Debug: for a small sample of unmatched requested codes, log candidate DB rows
        if (!unmatched.isEmpty() && logger.isDebugEnabled()) {
            final int SAMPLE_MAX = 10;
            List<String> sample = unmatched.size() > SAMPLE_MAX ? unmatched.subList(0, SAMPLE_MAX) : unmatched;
            for (String u : sample) {
                try {
                    List<Employee> candidates = new ArrayList<>();

                    employeeRepo.findByEmployeeCodeIgnoreCase(u).ifPresent(candidates::add);
                    employeeRepo.findByEmployeeCodeNewIgnoreCase(u).ifPresent(e -> { if (!candidates.contains(e)) candidates.add(e); });
                    employeeRepo.findByXidIgnoreCase(u).ifPresent(e -> { if (!candidates.contains(e)) candidates.add(e); });
                    employeeRepo.findByTixidIgnoreCase(u).ifPresent(e -> { if (!candidates.contains(e)) candidates.add(e); });
                    employeeRepo.findByBadgeNumIgnoreCase(u).ifPresent(e -> { if (!candidates.contains(e)) candidates.add(e); });
                    employeeRepo.findByBadgeNumNormIgnoreCase(u).ifPresent(e -> { if (!candidates.contains(e)) candidates.add(e); });

                    // Fallback: look for display name fragments that might hint at nearby rows
                    // Include LIKE-based near-matches (page-limited)
                    try {
                        List<Employee> likeMatches = employeeRepo.findByIdentifierLike(u, PageRequest.of(0, 5));
                        for (Employee e : likeMatches) {
                            if (!candidates.contains(e)) candidates.add(e);
                        }
                    } catch (Exception ignore) {
                        // repository method may not be available in older runtimes; fall back to displayName contains
                        List<Employee> nameMatches = employeeRepo.findByDisplayNameContainingIgnoreCase(u);
                        for (Employee e : nameMatches) {
                            if (candidates.size() >= 5) break;
                            if (!candidates.contains(e)) candidates.add(e);
                        }
                    }

                    List<String> summary = candidates.stream().map(e ->
                            String.format("%d|code=%s|codeNew=%s|xid=%s|badge=%s|name=%s",
                                    e.getEmployeeid(), nz(e.getEmployeeCode()), nz(e.getEmployeeCodeNew()), nz(e.getXid()), nz(e.getBadgeNum()), nz(e.getDisplayName()))
                    ).collect(Collectors.toList());

                    logger.debug("getEmployeeDetailsByCodes - unmatched sample '{}': {} candidate(s) -> {}", u, summary.size(), summary);
                } catch (Exception ex) {
                    logger.debug("getEmployeeDetailsByCodes - failed to fetch candidates for {}: {}", u, ex.getMessage());
                }
            }
        }

        return new com.cec.EmployeeDB.Dto.EmployeeDetailsBatchResponse(finalMap, unmatched);
    }

}
