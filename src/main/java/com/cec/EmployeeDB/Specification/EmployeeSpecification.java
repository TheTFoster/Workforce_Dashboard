package com.cec.EmployeeDB.Specification;

import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Dto.EmployeeFilterCriteria;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class EmployeeSpecification {

    public static Specification<Employee> getEmployeesWithCriteria(EmployeeFilterCriteria criteria) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // IDs
            if (criteria.getEmployeeIds() != null && !criteria.getEmployeeIds().isEmpty()) {
                predicates.add(root.get("employeeid").in(criteria.getEmployeeIds()));
            }

            // Names (exact)
            if (criteria.getNames() != null && !criteria.getNames().isEmpty()) {
                predicates.add(root.get("employeename").in(criteria.getNames()));
            }

            // Name contains (case-insensitive)
            if (criteria.getNameLike() != null && !criteria.getNameLike().isBlank()) {
                predicates.add(builder.like(
                        builder.lower(root.get("employeename")),
                        "%" + criteria.getNameLike().toLowerCase() + "%"
                ));
            }

            // Groups
            if (criteria.getGroups() != null && !criteria.getGroups().isEmpty()) {
                predicates.add(root.get("workGroup").in(criteria.getGroups()));
            }
            if (criteria.getGroupLike() != null && !criteria.getGroupLike().isBlank()) {
                predicates.add(builder.like(
                        builder.lower(root.get("workGroup")),
                        "%" + criteria.getGroupLike().toLowerCase() + "%"
                ));
            }

            // Ranked
            if (criteria.getRanked() != null && !criteria.getRanked().isEmpty()) {
                predicates.add(root.get("ranked").in(criteria.getRanked()));
            }

            // Projects
            if (criteria.getProjects() != null && !criteria.getProjects().isEmpty()) {
                predicates.add(root.get("project").in(criteria.getProjects()));
            }
            if (criteria.getProjectLike() != null && !criteria.getProjectLike().isBlank()) {
                predicates.add(builder.like(
                        builder.lower(root.get("project")),
                        "%" + criteria.getProjectLike().toLowerCase() + "%"
                ));
            }

            // Job numbers
            if (criteria.getJobNumbers() != null && !criteria.getJobNumbers().isEmpty()) {
                predicates.add(root.get("jobNumber").in(criteria.getJobNumbers()));
            }

            // Employee codes
            if (criteria.getEmployeeCodes() != null && !criteria.getEmployeeCodes().isEmpty()) {
                predicates.add(root.get("employeeCode").in(criteria.getEmployeeCodes()));
            }

            // Dates
            if (criteria.getStartDateFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("startDate"), criteria.getStartDateFrom()));
            }
            if (criteria.getStartDateTo() != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("startDate"), criteria.getStartDateTo()));
            }
            if (criteria.getStartDateEquals() != null) {
                predicates.add(builder.equal(root.get("startDate"), criteria.getStartDateEquals()));
            }

            if (criteria.getEndDateFrom() != null) {
                predicates.add(builder.greaterThanOrEqualTo(root.get("endDate"), criteria.getEndDateFrom()));
            }
            if (criteria.getEndDateTo() != null) {
                predicates.add(builder.lessThanOrEqualTo(root.get("endDate"), criteria.getEndDateTo()));
            }
            if (criteria.getEndDateEquals() != null) {
                predicates.add(builder.equal(root.get("endDate"), criteria.getEndDateEquals()));
            }

            // Activity
            if (Boolean.TRUE.equals(criteria.getActiveOnly())) {
                predicates.add(builder.isNull(root.get("endDate")));
            } else if (Boolean.TRUE.equals(criteria.getInactiveOnly())) {
                predicates.add(builder.isNotNull(root.get("endDate")));
            }

            // Levels
            if (criteria.getLevel1() != null) {
                predicates.add(builder.equal(root.get("level1"), criteria.getLevel1()));
            }
            if (criteria.getLevel2() != null) {
                predicates.add(builder.equal(root.get("levelTwo"), criteria.getLevel2()));
            }
            if (criteria.getLevel3() != null) {
                predicates.add(builder.equal(root.get("levelThree"), criteria.getLevel3()));
            }

            // Composite OR: names or codes exact
            if (criteria.getNamesOrCodes() != null && !criteria.getNamesOrCodes().isEmpty()) {
                List<Predicate> orPreds = new ArrayList<>();
                orPreds.add(root.get("employeename").in(criteria.getNamesOrCodes()));
                orPreds.add(root.get("employeeCode").in(criteria.getNamesOrCodes()));
                predicates.add(builder.or(orPreds.toArray(new Predicate[0])));
            }

            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
