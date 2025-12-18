// src/main/java/com/cec/EmployeeDB/util/CsvImportUtils.java
package com.cec.EmployeeDB.util;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.*;
import java.util.*;

public final class CsvImportUtils {
    private CsvImportUtils() {
    }

    private static final Set<String> NULL_SENTINELS = Set.of(
            "", "00/00/0000", "0000-00-00", "0", "NA", "N/A", "null", "NULL");

    // Accept common forms with/without time
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("M/d/uuuu").toFormatter(),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MM/dd/uuuu").toFormatter(),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("M/d/uu").toFormatter(),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("uuuu-MM-dd").toFormatter(),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("uuuu-MM-dd HH:mm[:ss]").toFormatter(),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("M/d/uuuu HH:mm[:ss]").toFormatter());

    /**
     * Normalize headers: strip BOM/space, replace non-alnum with '_', squash
     * repeats, trim edges.
     */
    public static String normalizeHeader(String h) {
        if (h == null)
            return "";
        String s = h.replace("\uFEFF", "").trim();
        s = s.replaceAll("[^A-Za-z0-9]+", "_");
        s = s.replaceAll("_+", "_");
        s = s.replaceAll("^_|_$", "");
        return s;
    }

    /** Build a row view that allows lookup by original and normalized header. */
    public static Map<String, String> canonicalizeRow(Map<String, String> raw) {
        Map<String, String> out = new LinkedHashMap<>();
        for (var e : raw.entrySet()) {
            String k = e.getKey() == null ? "" : e.getKey();
            String v = e.getValue() == null ? null : e.getValue().strip();
            out.put(k, v);
            String norm = normalizeHeader(k);
            out.putIfAbsent(norm, v);
        }
        return out;
    }

    /**
     * First non-blank value for any key (checks both raw and normalized names if
     * present).
     */
    public static String first(Map<String, String> row, String... keys) {
        for (String k : keys) {
            if (k == null)
                continue;
            String direct = row.get(k);
            if (direct != null && !direct.isBlank())
                return direct.strip();
            String norm = normalizeHeader(k);
            if (!norm.equals(k)) {
                String v = row.get(norm);
                if (v != null && !v.isBlank())
                    return v.strip();
            }
        }
        return null;
    }

    /** Like first(), but treats common sentinel values as null. */
    public static String firstMeaningful(Map<String, String> row, String... keys) {
        String v = first(row, keys);
        if (v == null)
            return null;
        return NULL_SENTINELS.contains(v.trim()) ? null : v;
    }

    /** Parse a date or return null. Discards time parts. */
    public static LocalDate parseDate(String raw) {
        if (raw == null)
            return null;
        String s = raw.strip();
        if (s.isEmpty() || NULL_SENTINELS.contains(s))
            return null;

        // if there is a space, try whole string first (formats above handle time),
        // else fall back to just the date token
        for (DateTimeFormatter f : DATE_FORMATS) {
            try {
                if (f.toString().contains("HH")) {
                    LocalDateTime ldt = LocalDateTime.parse(s, f);
                    return ldt.toLocalDate();
                } else {
                    return LocalDate.parse(s, f);
                }
            } catch (DateTimeParseException ignored) {
            }
        }

        // last-chance ISO
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException ignored) {
        }
        return null;
    }

    /** Parse money/number fields: strips $, commas; returns null on failure. */
    public static BigDecimal parseMoney(String raw) {
        if (raw == null)
            return null;
        String s = raw.strip();
        if (s.isEmpty())
            return null;
        s = s.replaceAll("[,$]", "");
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException ignore) {
            return null;
        }
    }
}
