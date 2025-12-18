// GreetingComponent.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const GreetingComponent = () => {
    const [greeting, setGreeting] = useState("");

    useEffect(() => {
        axios.get("http://localhost:8080/hello")
            .then(response => {
                setGreeting(response.data.message);
            })
            .catch(error => {
                console.error("Error fetching the greeting:", error);
            });
    }, []);

    return (
        <div>
            <h1>{greeting || "Loading..."}</h1>
        </div>
    );
};

export default GreetingComponent;
