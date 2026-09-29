import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

let mockUser = null;
jest.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: mockUser, login: jest.fn(), signup: jest.fn(), resetPassword: jest.fn() }),
}));
jest.mock("./components/DashboardLayout", () => () => <div>dashboard</div>);

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

test("signed-out users are redirected from the dashboard to login", () => {
  mockUser = null;
  renderAt("/");
  expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /log ?in|sign ?in/i })).toBeInTheDocument();
});

test("signed-in users see the dashboard", () => {
  mockUser = { uid: "u1", email: "a@b.c" };
  renderAt("/");
  expect(screen.getByText("dashboard")).toBeInTheDocument();
});
