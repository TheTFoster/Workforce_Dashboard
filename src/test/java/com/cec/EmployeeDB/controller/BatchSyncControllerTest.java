package com.cec.EmployeeDB.controller;

import com.cec.EmployeeDB.Config.LocalDateFormatter;
import com.cec.EmployeeDB.Service.FieldBatchSyncService;
import com.cec.EmployeeDB.Service.FieldImportService;
import com.cec.EmployeeDB.batch.dto.BatchReport;
import com.cec.EmployeeDB.Dto.FieldImportResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BatchSyncController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(LocalDateFormatter.class)
class BatchSyncControllerTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    FieldImportService importService;

    @MockBean
    FieldBatchSyncService fieldBatchSyncService;

    @Test
    void preview_returns_report() throws Exception {
        when(fieldBatchSyncService.preview()).thenReturn(BatchReport.empty("ok"));

        mvc.perform(post("/api/v1/batch-sync/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errors[0]").value(org.hamcrest.Matchers.containsString("ok")));
    }

    @Test
    void upload_returns_result() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.csv", "text/csv", "a,b,c".getBytes());
        when(importService.importCsv(file)).thenReturn(new FieldImportResult("test.csv", 1, 0, 0, "ok"));

        mvc.perform(multipart("/api/v1/batch-sync/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("test.csv"))
                .andExpect(jsonPath("$.rowsLoaded").value(1));
    }
}
