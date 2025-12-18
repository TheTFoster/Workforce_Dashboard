package com.cec.EmployeeDB.Security;

import com.cec.EmployeeDB.Config.AppProperties;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private final int forgotPerIpPerHour;
    private final int forgotPerIdPerHour;
    private final int resetPerIpPerHour;
    private final int loginPerIpPerHour;
    private final int loginPerIdPerHour;

    private static class Slot {
        long windowStart; 
        int count;
    }

    private final Map<String, Slot> counters = new ConcurrentHashMap<>();

    public RateLimiterService(AppProperties props) {
        this.forgotPerIpPerHour = props.getRate().getForgotPerIpPerHour();
        this.forgotPerIdPerHour = props.getRate().getForgotPerIdPerHour();
        this.resetPerIpPerHour   = props.getRate().getResetPerIpPerHour();
        this.loginPerIpPerHour   = props.getRate().getLoginPerIpPerHour();
        this.loginPerIdPerHour   = props.getRate().getLoginPerIdPerHour();
    }

    private boolean allow(String key, int limit) {
        long hour = Instant.now().getEpochSecond() / 3600L;
        Slot slot = counters.computeIfAbsent(key, k -> new Slot());
        synchronized (slot) {
            if (slot.windowStart != hour) {
                slot.windowStart = hour;
                slot.count = 0;
            }
            if (slot.count >= limit) return false;
            slot.count++;
            return true;
        }
    }

    public boolean allowForgotByIp(String ip) { return allow("F_IP:" + ip, forgotPerIpPerHour); }
    public boolean allowForgotById(String id) { return allow("F_ID:" + id, forgotPerIdPerHour); }
    public boolean allowResetByIp(String ip)   { return allow("R_IP:" + ip, resetPerIpPerHour); }
    public boolean allowLoginByIp(String ip)   { return allow("L_IP:" + ip, loginPerIpPerHour); }
    public boolean allowLoginById(String id)   { return allow("L_ID:" + id, loginPerIdPerHour); }
}
