package com.cec.EmployeeDB.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "mandown_groups")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MandownGroup {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "color")
    private String color;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "mandown_group_employees", joinColumns = @JoinColumn(name = "group_id"))
    @Column(name = "employee_id")
    private List<String> employeeIds = new ArrayList<>();
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "display_order")
    private Integer displayOrder;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
