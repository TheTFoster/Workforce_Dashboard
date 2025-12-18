//package com.cec.EmployeeDB.Config;
//
//import org.springframework.boot.jdbc.DataSourceBuilder;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.context.annotation.Primary;
//
//import javax.sql.DataSource;
//
//@Configuration
//public class DriverManagerDataSource {
//
//    @Bean(name = "AccessDataSource")
//    @Primary
//    public DataSource AccessDataSource() {
//        return DataSourceBuilder.create()
//                .driverClassName("net.ucanaccess.jdbc.UcanaccessDriver")
//                .url("jdbc:ucanaccess://C:/Users/rfoster/Desktop/AccessDBs/EmployeeDatabase.accdb")
//                .build();
//    }
//}
