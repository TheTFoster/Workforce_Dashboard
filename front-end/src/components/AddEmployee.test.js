import { render, screen, fireEvent } from "@testing-library/react";
import AddEmployee from "./AddEmployee";
import { BrowserRouter as Router } from "react-router-dom";

test("renders AddEmployee form", () => {
    render(
        <Router>
            <AddEmployee />
        </Router>
    );

    // Check if the form title is present
    expect(screen.getByText("Add New Employee")).toBeInTheDocument();

    // Check if fields are rendered
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
});

test("validates required fields on submit", () => {
    render(
        <Router>
            <AddEmployee />
        </Router>
    );

    fireEvent.click(screen.getByText("Save Employee"));
    expect(screen.getByText(/Please fill out the First Name field./)).toBeInTheDocument();
});

test("navigates between sections", () => {
    render(
        <Router>
            <AddEmployee />
        </Router>
    );

    // Check initial section
    expect(screen.getByText("Employee Information")).toBeInTheDocument();

    // Navigate to next section
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Group & Supervisor Information")).toBeInTheDocument();
});
