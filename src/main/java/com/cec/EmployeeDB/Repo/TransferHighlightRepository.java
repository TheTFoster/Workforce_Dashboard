package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.TransferHighlight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransferHighlightRepository extends JpaRepository<TransferHighlight, Long> {
    Optional<TransferHighlight> findByTransferId(Long transferId);
}
