// src/main/java/com/cec/EmployeeDB/Config/JpaFixConfig.java
package com.cec.EmployeeDB.Config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;

@Configuration(proxyBeanMethods = false)
public class JpaFixConfig {

  @Bean
  public static BeanPostProcessor emfInterfaceFixer() {
    return new BeanPostProcessor() {
      @Override
      public Object postProcessBeforeInitialization(@NonNull Object bean, @NonNull String beanName) {
        if (bean instanceof LocalContainerEntityManagerFactoryBean emf) {
          emf.setEntityManagerFactoryInterface(EntityManagerFactory.class);
        }
        return bean;
      }

      @Override
      public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) {
        return bean; 
      }
    };
  }
}
