package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Config.LocalDateFormatter;
import com.cec.EmployeeDB.Entity.Supervisor;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@WebMvcTest(controllers = AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(LocalDateFormatter.class)
class AdminControllerTest {

    @Autowired
    MockMvc mvc;

    @Mock
    SupervisorRepository supervisorRepository;

    @Mock
    PasswordEncoder passwordEncoder;

    @Test
    void nextUserId_returns_incremented() throws Exception {
        given(supervisorRepository.findMaxEmployeeid()).willReturn(5);

        mvc.perform(get("/api/v1/admin/users/next-id"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextId").value(6));
    }

    @Test
    void createUser_conflict_returns_bad_request() throws Exception {
        given(supervisorRepository.findByEmployeeCode(any())).willReturn(Optional.of(new Supervisor()));
        given(supervisorRepository.findByEmployeeCodeIgnoreCase(any())).willReturn(Optional.of(new Supervisor()));

        mvc.perform(post("/api/v1/admin/users")
                        .contentType(MediaType.APPLICATION_JSON != null ? MediaType.APPLICATION_JSON : MediaType.valueOf("application/json"))
                        .content("{\"employeeCode\":\"EE1\",\"password\":\"pw\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Employee code already exists"));
    }

    @SuppressWarnings("null")
    @Test
    void createUser_success_returns_created() throws Exception {
        given(supervisorRepository.findByEmployeeCode(any())).willReturn(Optional.empty());
        given(supervisorRepository.findByEmployeeCodeIgnoreCase(any())).willReturn(Optional.empty());
        given(supervisorRepository.findMaxEmployeeid()).willReturn(1);
        given(passwordEncoder.encode(any())).willReturn("hashed");

        mvc.perform(post("/api/v1/admin/users")
                        .contentType(java.util.Objects.requireNonNull(MediaType.APPLICATION_JSON))
                        .content("{\"employeeCode\":\"EE2\",\"password\":\"pw\",\"name\":\"A\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("created"));

        verify(supervisorRepository).save(org.mockito.ArgumentMatchers.<Supervisor>any());
    }
}
