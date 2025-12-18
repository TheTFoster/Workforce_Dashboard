package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Entity.MandownGroup;
import com.cec.EmployeeDB.Repo.MandownGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MandownGroupService {
    
    private final MandownGroupRepository repository;
    
    public List<MandownGroup> getAllGroups() {
        return repository.findAllByOrderByDisplayOrderAsc();
    }
    
    public Optional<MandownGroup> getGroupById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return repository.findById(id);
    }
    
    @Transactional
    public MandownGroup createGroup(MandownGroup group) {
        // Set display order to max + 1 if not set
        if (group.getDisplayOrder() == null) {
            int maxOrder = repository.findAll().stream()
                .mapToInt(g -> g.getDisplayOrder() != null ? g.getDisplayOrder() : 0)
                .max()
                .orElse(0);
            group.setDisplayOrder(maxOrder + 1);
        }
        return repository.save(group);
    }
    
    @Transactional
    public MandownGroup updateGroup(Long id, MandownGroup updatedGroup) {
        if (id == null) {
            throw new IllegalArgumentException("Group id cannot be null");
        }
        return repository.findById(id)
            .map(existing -> {
                existing.setName(updatedGroup.getName());
                existing.setColor(updatedGroup.getColor());
                existing.setEmployeeIds(updatedGroup.getEmployeeIds());
                if (updatedGroup.getDisplayOrder() != null) {
                    existing.setDisplayOrder(updatedGroup.getDisplayOrder());
                }
                return repository.save(existing);
            })
            .orElseThrow(() -> new RuntimeException("Group not found with id: " + id));
    }
    
    @Transactional
    public void deleteGroup(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Group id cannot be null");
        }
        repository.deleteById(id);
    }
    
    @Transactional
    public void reorderGroups(List<Long> groupIds) {
        for (int i = 0; i < groupIds.size(); i++) {
            final int order = i;
            Long groupId = groupIds.get(i);
            if (groupId != null) {
                repository.findById(groupId).ifPresent(group -> {
                    group.setDisplayOrder(order);
                    repository.save(group);
                });
            }
        }
    }
    
    @Transactional
    public MandownGroup addEmployeesToGroup(Long groupId, List<String> employeeIds) {
        if (groupId == null) {
            throw new IllegalArgumentException("Group id cannot be null");
        }
        return repository.findById(groupId)
            .map(group -> {
                List<String> currentIds = group.getEmployeeIds();
                employeeIds.forEach(empId -> {
                    if (!currentIds.contains(empId)) {
                        currentIds.add(empId);
                    }
                });
                group.setEmployeeIds(currentIds);
                return repository.save(group);
            })
            .orElseThrow(() -> new RuntimeException("Group not found with id: " + groupId));
    }
    
    @Transactional
    public MandownGroup removeEmployeeFromGroup(Long groupId, String employeeId) {
        if (groupId == null) {
            throw new IllegalArgumentException("Group id cannot be null");
        }
        return repository.findById(groupId)
            .map(group -> {
                group.getEmployeeIds().remove(employeeId);
                return repository.save(group);
            })
            .orElseThrow(() -> new RuntimeException("Group not found with id: " + groupId));
    }
}
