package com.cec.EmployeeDB.Dto.batch;

import lombok.Data;

@Data
public class ApplyRequest {
    public Rules rules = new Rules();
    public Scope scope = new Scope();

    @Data public static class Rules {
        public boolean allowFallbackMatch;
        public boolean ackMapping;
        public boolean ackDeactivations;
        public boolean ackTerminations;
        public boolean ackWageDecreases;
    }

    @Data public static class Scope {
        public boolean deactivations = true;
        public boolean terminations = false;
        public boolean reactivations = false;
        public boolean updatesOther = true;
    }
}