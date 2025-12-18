package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Repo.EmployeeRepo;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class LookupService {

    private final EmployeeRepo employeeRepo;

    public LookupService(EmployeeRepo employeeRepo) {
        this.employeeRepo = employeeRepo;
    }

    private static List<String> normalize(List<String> xs) {
        return xs.stream()
                .filter(Objects::nonNull)
                .map(s -> s.trim())
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted(String::compareToIgnoreCase)
                .collect(Collectors.toList());
    }

    @Cacheable("lookup_groups")
    public List<String> groups() {
        return normalize(employeeRepo.findDistinctWorkGroup());
    }

    @Cacheable("lookup_ranks")
    public List<String> ranks() {
        return normalize(employeeRepo.findDistinctRanked());
    }

    @Cacheable("lookup_projects")
    public List<String> projects() {
        return normalize(employeeRepo.findDistinctProject());
    }

    @Cacheable("lookup_jobnumbers")
    public List<String> jobNumbers() {
        return normalize(employeeRepo.findDistinctJobNumber());
    }

    @Cacheable("lookup_supervisors")
    public List<String> supervisors() {
        return normalize(employeeRepo.findDistinctSupervisor());
    }
}