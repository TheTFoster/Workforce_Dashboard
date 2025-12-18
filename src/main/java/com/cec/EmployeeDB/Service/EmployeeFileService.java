package com.cec.EmployeeDB.Service;

import com.cec.EmployeeDB.Entity.EmployeeFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

public interface EmployeeFileService {
    Optional<EmployeeFile> findOne(Integer empId, Long fileId);
    List<EmployeeFile> findAllByEmployee(Integer empId);
    EmployeeFile uploadFile(Integer empId, MultipartFile file) throws Exception;
    void deleteFile(Integer empId, Long fileId) throws Exception;
}
