// EmployeeComponent.js
import React, { useState } from 'react';
import axios from 'axios';

const EmployeeComponent = () => {
    const [employeeId, setEmployeeId] = useState("");
    const [loginMessage, setLoginMessage] = useState("");

    // State for employee data and login data
    const [employeeData, setEmployeeData] = useState({
        name: '',
        cecid: '',
        department: ''
    });

    const [loginData, setLoginData] = useState({
        cecid: '',
        password: ''
    });

    // Handler for saving employee data
    const saveEmployee = () => {
        axios.post("http://localhost:8080/api/v1/employee/save", employeeData)
            .then(response => {
                setEmployeeId(response.data);  // assuming response is the employee ID
            })
            .catch(error => {
                console.error("Error saving employee:", error);
            });
    };

    // Handler for employee login
    const loginEmployee = () => {
        axios.post("http://localhost:8080/api/v1/employee/login", loginData)
            .then(response => {
                setLoginMessage(response.data.message); // assuming the response contains a message
            })
            .catch(error => {
                console.error("Error logging in:", error);
            });
    };

    return (
        <div>
            <h2>Save DataBase User</h2>
            <input type="text" placeholder="Name" onChange={e => setEmployeeData({ ...employeeData, name: e.target.value })} />
            <input type="text" placeholder="CEC ID" onChange={e => setEmployeeData({ ...employeeData, age: e.target.value })} />
            <input type="text" placeholder="Password" onChange={e => setEmployeeData({ ...employeeData, department: e.target.value })} />
            <button onClick={saveEmployee}>Save Employee</button>
            {employeeId && <p>Employee saved with ID: {employeeId}</p>}

            <h2>Login Employee</h2>
            <input type="text" placeholder="CEC ID" onChange={e => setLoginData({ ...loginData, username: e.target.value })} />
            <input type="password" placeholder="Password" onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
            <button onClick={loginEmployee}>Login</button>
            {loginMessage && <p>{loginMessage}</p>}
        </div>
    );
};

export default EmployeeComponent;
