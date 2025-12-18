import { useState } from "react";
import api from "../api";
import '../stylesheets/Register.module.css';
import { useNavigate } from "react-router-dom";

function Register() {
    const [supervisorName, setSupervisorName] = useState("");
    const [cecId, setCecId] = useState("");
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const navigate = useNavigate();
    const validatePassword = (pwd) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\\[\]{};':"\\|,.<>\\/?])[A-Za-z\d@$!%*?&#^()_+\-=\\[\]{};':"\\|,.<>\\/?]{8,}$/;
        return regex.test(pwd);
    };

    async function save(event) {
        event.preventDefault();
        if (password.trim() !== "" && !validatePassword(password)) {
            setPasswordError("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
            return;
        } else {
            setPasswordError("");
        }

        try {
            const validateResponse = await api.post("/api/v1/supervisor/validate", {
                name: supervisorName,
                cecId: cecId,
            });

            if (!validateResponse.data.exists) {
                alert("You are not part of Supervision. Access denied to the Employee Database.");
                return;
            }

            if (validateResponse.data.hasPassword) {
                const override = window.confirm("A password is already set. Do you want to override the original password?");
                if (!override) return;
            } else if (password.trim() === "") {
                alert("Please enter a new password.");
                return;
            }

            await api.post("/api/v1/supervisor/save", {
                name: supervisorName,
                cecId: cecId,
                password: password,
            });

            alert("Supervisor Registration Successful");
            navigate("/login");
        } catch (err) {
            alert("Error: " + err.message);
        }
    }

    const clearForm = () => {
        setSupervisorName("");
        setCecId("");
        setPassword("");
        setPasswordError("");
    };

    return (
        <div>
            <div className="container mt-4">
                <div className="card">
                    <h1>Supervisor Registration</h1>
                    <form>
                        <div className="form-group">
                            <label>Supervisor Name</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter Name"
                                value={supervisorName}
                                onChange={(event) => setSupervisorName(event.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>CEC ID</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter CEC ID"
                                value={cecId}
                                onChange={(event) => setCecId(event.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Enter password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                            {passwordError && <p style={{ color: "red" }}>{passwordError}</p>}
                        </div>
                        <button type="submit" className="btn btn-primary mt-4" onClick={save}>
                            Save
                        </button>
                        <button
                            type="button"
                            className="btn btn-secondary mt-4 ml-2"
                            onClick={clearForm}
                        >
                            Clear Form
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Register;
