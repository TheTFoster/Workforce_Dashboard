package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.EmployeeProjectPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeProjectPredictionRepository extends JpaRepository<EmployeeProjectPrediction, String> { }
