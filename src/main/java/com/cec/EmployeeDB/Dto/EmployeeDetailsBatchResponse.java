package com.cec.EmployeeDB.Dto;

import java.util.List;
import java.util.Map;

public class EmployeeDetailsBatchResponse {
    private Map<String, EmployeeDTO> results;
    private List<String> unmatchedRequested;

    public EmployeeDetailsBatchResponse() {}

    public EmployeeDetailsBatchResponse(Map<String, EmployeeDTO> results, List<String> unmatchedRequested) {
        this.results = results;
        this.unmatchedRequested = unmatchedRequested;
    }

    public Map<String, EmployeeDTO> getResults() {
        return results;
    }

    public void setResults(Map<String, EmployeeDTO> results) {
        this.results = results;
    }

    public List<String> getUnmatchedRequested() {
        return unmatchedRequested;
    }

    public void setUnmatchedRequested(List<String> unmatchedRequested) {
        this.unmatchedRequested = unmatchedRequested;
    }
}
