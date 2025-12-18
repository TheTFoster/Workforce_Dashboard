// once at app startup
import axios from "axios";
axios.defaults.withCredentials = true;
axios.interceptors.response.use(
  r => r,
  err => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("auth");
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);
