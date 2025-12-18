package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Dto.LoginDTO;
import com.cec.EmployeeDB.Service.EmployeeService;
import com.cec.EmployeeDB.Repo.EmployeeRepo;
import com.cec.EmployeeDB.Repo.SupervisorRepository;
import com.cec.EmployeeDB.Security.RateLimiterService;
import com.cec.EmployeeDB.payloadresponse.LoginMessage;
import com.cec.EmployeeDB.Config.LocalDateFormatter;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(LocalDateFormatter.class)
class AuthControllerTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    EmployeeService employeeService;

    @MockBean
    com.cec.EmployeeDB.auth.PwChangeTokenService pwChangeTokenService;

    @MockBean
    SupervisorRepository supervisorRepository;

    @MockBean
    EmployeeRepo employeeRepo;

    @MockBean
    RateLimiterService rateLimiterService;

    @MockBean
    PasswordEncoder passwordEncoder;

    @Test
    void login_success_returns_ok_payload() throws Exception {
        given(rateLimiterService.allowLoginByIp(any())).willReturn(true);
        given(rateLimiterService.allowLoginById(any())).willReturn(true);
        given(employeeService.loginEmployee(any(LoginDTO.class)))
                .willReturn(new LoginMessage("ok", true));
        given(supervisorRepository.findByEmployeeCode(any())).willReturn(Optional.empty());
        given(supervisorRepository.findByEmployeeCodeIgnoreCase(any())).willReturn(Optional.empty());

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeCode\":\"EE1\",\"password\":\"pw\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(true));
    }

    @Test
    void login_rate_limited_returns_429() throws Exception {
        given(rateLimiterService.allowLoginByIp(any())).willReturn(false);
        given(rateLimiterService.allowLoginById(any())).willReturn(false);

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeCode\":\"EE1\",\"password\":\"pw\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(false));
    }
}
