import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.FileInputStream;

public class ReadXlsx {
    public static void main(String[] args) throws Exception {
        String file = "C:\\Users\\rfoster\\Downloads\\20251126114900_Time_For_Everyone_9f93d429-5eee9d00-5856-40ba-8a66-c57980c5e9ce.xlsx";
        try (FileInputStream fis = new FileInputStream(file);
             Workbook wb = new XSSFWorkbook(fis)) {
            Sheet sheet = wb.getSheetAt(0);
            
            // Read header row
            Row headerRow = sheet.getRow(0);
            System.out.println("=== HEADERS ===");
            if (headerRow != null) {
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    Cell cell = headerRow.getCell(i);
                    if (cell != null) {
                        System.out.println(i + ": " + cell.getStringCellValue());
                    }
                }
            }
            
            // Read first data row
            System.out.println("\n=== FIRST DATA ROW ===");
            Row firstRow = sheet.getRow(1);
            if (firstRow != null) {
                for (int i = 0; i < firstRow.getLastCellNum(); i++) {
                    Cell cell = firstRow.getCell(i);
                    if (cell != null) {
                        System.out.print(i + ": ");
                        switch (cell.getCellType()) {
                            case STRING -> System.out.println(cell.getStringCellValue());
                            case NUMERIC -> System.out.println(cell.getNumericCellValue());
                            default -> System.out.println(cell.toString());
                        }
                    }
                }
            }
            
            System.out.println("\nTotal rows: " + sheet.getLastRowNum());
        }
    }
}
