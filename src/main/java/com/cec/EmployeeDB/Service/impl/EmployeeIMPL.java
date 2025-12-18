//package com.cec.EmployeeDB.Service.impl;
//
//import com.cec.EmployeeDB.Dto.EmployeeDTO;
//import com.cec.EmployeeDB.Dto.LoginDTO;
//import com.cec.EmployeeDB.Entity.Employee;
//import com.cec.EmployeeDB.Entity.Supervisor;
//import com.cec.EmployeeDB.Repo.EmployeeRepo;
//import com.cec.EmployeeDB.Repo.SupervisorRepository;
//import com.cec.EmployeeDB.Service.EmployeeService;
//import com.cec.EmployeeDB.payloadresponse.LoginMessage;
//import org.springframework.security.crypto.password.PasswordEncoder;
//import org.springframework.stereotype.Service;
//
//import java.util.List;
//import java.util.Optional;
//import java.util.stream.Collectors;
//
//@Service
//public class EmployeeIMPL implements EmployeeService {
//
//    private final EmployeeRepo employeeRepo;
//    private final PasswordEncoder passwordEncoder;
//
//    public EmployeeIMPL(EmployeeRepo employeeRepo, PasswordEncoder passwordEncoder) {
//        this.employeeRepo = employeeRepo;
//        this.passwordEncoder = passwordEncoder;
//    }
//
//    @Override
//    public String addEmployee(EmployeeDTO employeeDTO) {
//        Employee employee = new Employee(
//                employeeDTO.getEmployeeid(),
//                employeeDTO.getEmployeename(),
//                employeeDTO.getemployeeCode(),
//                this.passwordEncoder.encode(employeeDTO.getPassword())
//        );
//        employeeRepo.save(employee);
//        return employee.getEmployeename();
//    }
//
//    @Override
//    public String editEmployee(EmployeeDTO employeeDTO) {
//        Optional<Employee> existingEmployee = employeeRepo.findById(employeeDTO.getEmployeeid());
//        if (existingEmployee.isPresent()) {
//            Employee employee = existingEmployee.get();
//            employee.setEmployeename(employeeDTO.getEmployeename());
//            employee.setemployeeCode(employeeDTO.getemployeeCode());
//            employeeRepo.save(employee);
//            return "Employee updated successfully.";
//        }
//        return "Employee not found.";
//    }
//
//    @Override
//    public LoginMessage loginEmployee(LoginDTO loginDTO) {
//        // Fetch supervisor by CEC ID (username)
//        Supervisor supervisor = SupervisorRepository.findByEmployeeCode(loginDTO.getUsername());
//
//        if (supervisor == null) {
//            return new LoginMessage("EmployeeCode not exists");
//        }
//
//        // Check password match
//        if (supervisor.getPassword().equals(loginDTO.getPassword())) {
//            return new LoginMessage("Login Success");
//        } else {
//            return new LoginMessage("Incorrect EmployeeCode and Password");
//        }
//    }
//
//    @Override
//    public String deleteEmployee(EmployeeDTO employeeDTO) {
//        Optional<Employee> employee = employeeRepo.findById(employeeDTO.getEmployeeid());
//        if (employee.isPresent()) {
//            employeeRepo.delete(employee.get());
//            return "Employee deleted successfully.";
//        }
//        return "Employee not found.";
//    }
//
//    @Override
//    public List<EmployeeDTO> getAllEmployees() {
//        return employeeRepo.findAll().stream()
//                .map(employee -> new EmployeeDTO(
//                        employee.getEmployeeid(),
//                        employee.getEmployeename(),
//                        employee.getemployeeCode(),
//                        null  // Do not expose password in DTO
//                ))
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public EmployeeDTO getEmployeeById(int id) {
//        Optional<Employee> employee = employeeRepo.findById(id);
//        return employee.map(emp -> new EmployeeDTO(
//                emp.getEmployeeid(),
//                emp.getEmployeename(),
//                emp.getemployeeCode(),
//                null  // Do not expose password in DTO
//        )).orElse(null);
//    }
//}
