package com.cec.EmployeeDB.Config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Mail mail = new Mail();
    private final Reset reset = new Reset();
    private final Rate rate = new Rate();
    private final Captcha captcha = new Captcha();

    public Mail getMail() { return mail; }
    public Reset getReset() { return reset; }
    public Rate getRate() { return rate; }
    public Captcha getCaptcha() { return captcha; }

    public static class Mail {
        /** From header for outbound emails */
        private String from = "Employee DB <no-reply@localhost>";
        /** Where to send reset links if user emails aren’t stored */
        private String resetRecipient = "rfoster@cecfg.com";

        public String getFrom() { return from; }
        public void setFrom(String from) { this.from = from; }
        public String getResetRecipient() { return resetRecipient; }
        public void setResetRecipient(String resetRecipient) { this.resetRecipient = resetRecipient; }
    }

    public static class Reset {
        /** SPA page the user lands on to enter a new password */
        private String baseUrl = "http://localhost:3000/reset-password";
        /** Token lifetime in hours */
        private int tokenHours = 2;

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public int getTokenHours() { return tokenHours; }
        public void setTokenHours(int tokenHours) { this.tokenHours = tokenHours; }
    }

    public static class Rate {
        private int forgotPerIpPerHour = 10;
        private int forgotPerIdPerHour = 5;
        private int resetPerIpPerHour = 10;
        private int loginPerIpPerHour = 20;
        private int loginPerIdPerHour = 10;

        public int getForgotPerIpPerHour() { return forgotPerIpPerHour; }
        public void setForgotPerIpPerHour(int v) { this.forgotPerIpPerHour = v; }
        public int getForgotPerIdPerHour() { return forgotPerIdPerHour; }
        public void setForgotPerIdPerHour(int v) { this.forgotPerIdPerHour = v; }
        public int getResetPerIpPerHour() { return resetPerIpPerHour; }
        public void setResetPerIpPerHour(int v) { this.resetPerIpPerHour = v; }
        public int getLoginPerIpPerHour() { return loginPerIpPerHour; }
        public void setLoginPerIpPerHour(int v) { this.loginPerIpPerHour = v; }
        public int getLoginPerIdPerHour() { return loginPerIdPerHour; }
        public void setLoginPerIdPerHour(int v) { this.loginPerIdPerHour = v; }
    }

    public static class Captcha {
        private boolean enabled = false;
        private String provider = "recaptcha";
        private String secret = "";

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
    }
}
