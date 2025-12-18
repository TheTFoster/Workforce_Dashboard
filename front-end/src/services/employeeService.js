import axios from 'axios';

const API_URL = 'http://localhost:8086/api/v1/employee';

export const fetchEmployees = async () => {
    try {
        const response = await axios.get(`${API_URL}/list`);
        return response.data;
    } catch (error) {
        console.error("Error fetching employees:", error);
        throw error;
    }
};