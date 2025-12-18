package com.cec.EmployeeDB.Dto;

import java.time.LocalDateTime;

public record TransferHighlightDto(Long transferId, String color, String createdBy, LocalDateTime updatedAt) { }
