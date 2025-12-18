package com.cec.EmployeeDB.Repo;

import com.cec.EmployeeDB.Entity.Timecard;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface TimecardRepo extends JpaRepository<Timecard, Long> {

    // ANY overlap with the window
    // Uses JPQL for proper entity mapping, relies on database indexes for performance
    @Query("""
        select t from Timecard t
        where t.inPunchTime < :to
          and (t.outPunchTime is null or t.outPunchTime >= :from)
    """)
    Page<Timecard> findOverlapping(@Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to,
                                   Pageable pageable);
}
