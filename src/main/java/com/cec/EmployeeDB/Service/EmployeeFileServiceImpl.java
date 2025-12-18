package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Entity.Employee;
import com.cec.EmployeeDB.Entity.EmployeeFile;
import com.cec.EmployeeDB.Repo.EmployeeFileRepository;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class EmployeeFileServiceImpl implements EmployeeFileService {

    private final EmployeeFileRepository fileRepository;
    private final EmployeeRepo employeeRepo;

    public EmployeeFileServiceImpl(EmployeeFileRepository fileRepository, EmployeeRepo employeeRepo) {
        this.fileRepository = fileRepository;
        this.employeeRepo = employeeRepo;
    }

    @Override
    public Optional<EmployeeFile> findOne(Integer empId, Long fileId) {
        return fileRepository.findById(Objects.requireNonNull(fileId, "fileId cannot be null"))
                .filter(f -> f.getEmployee() != null && empId.equals(f.getEmployee().getEmployeeid()));
    }

    @Override
    public List<EmployeeFile> findAllByEmployee(Integer empId) {
        return fileRepository.findAllByEmployeeEmployeeidOrderByCreatedAtDesc(empId);
    }

    @Override
    @Transactional
    public EmployeeFile uploadFile(Integer empId, MultipartFile file) throws Exception {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        Employee employee = employeeRepo.findById(Objects.requireNonNull(empId, "empId cannot be null"))
                .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + empId));

        EmployeeFile employeeFile = new EmployeeFile();
        employeeFile.setEmployee(employee);
        employeeFile.setFileName(file.getOriginalFilename());
        employeeFile.setContentType(file.getContentType());
        employeeFile.setBytes(file.getBytes());

        return fileRepository.save(employeeFile);
    }

    @Override
    @Transactional
    public void deleteFile(Integer empId, Long fileId) throws Exception {
        EmployeeFile file = findOne(empId, fileId)
                .orElseThrow(() -> new IllegalArgumentException("File not found or does not belong to employee"));
        fileRepository.delete(Objects.requireNonNull(file));
    }
}
