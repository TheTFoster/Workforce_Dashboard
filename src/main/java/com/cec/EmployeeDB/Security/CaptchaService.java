package com.cec.EmployeeDB.Security;

import com.cec.EmployeeDB.Config.AppProperties;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Objects;

@Service
public class CaptchaService {

    private final AppProperties props;
    private final RestTemplate rt = new RestTemplate();

    public CaptchaService(AppProperties props) {
        this.props = props;
    }

    public boolean verify(String token, String remoteIp) {
        if (!props.getCaptcha().isEnabled()) return true;

        String provider = props.getCaptcha().getProvider();
        if ("recaptcha".equalsIgnoreCase(provider)) {
            String url = "https://www.google.com/recaptcha/api/siteverify";
            HttpHeaders h = new HttpHeaders();
            h.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            StringBuilder body = new StringBuilder()
                    .append("secret=").append(props.getCaptcha().getSecret())
                    .append("&response=").append(token == null ? "" : token);
            if (remoteIp != null && !remoteIp.isBlank()) {
                body.append("&remoteip=").append(remoteIp);
            }

            HttpEntity<String> req = new HttpEntity<>(body.toString(), h);
            ResponseEntity<Map<String, Object>> resp = rt.exchange(
                    url, Objects.requireNonNull(HttpMethod.POST, "HttpMethod cannot be null"), req, new ParameterizedTypeReference<Map<String, Object>>() {});

            Map<String, Object> map = resp.getBody(); // may be null
            Object success = (map == null) ? null : map.get("success");
            return Boolean.TRUE.equals(success);
        }

        // Unknown provider → allow (or flip to false if you prefer)
        return true;
    }
}
