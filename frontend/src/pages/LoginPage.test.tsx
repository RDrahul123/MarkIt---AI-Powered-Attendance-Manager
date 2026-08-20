import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import LoginPage from "@/pages/LoginPage";

vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    apiFetch: vi.fn(),
    apiFetchBlob: vi.fn(),
  }),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    token: null,
    isAuthenticated: false,
    setUser: vi.fn(),
  }),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("LoginPage", () => {
  it("renders login form with username and password fields", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("allows typing in username and password", () => {
    renderWithProviders(<LoginPage />);
    const usernameInput = screen.getByLabelText(/username/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    fireEvent.change(usernameInput, { target: { value: "admin" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    expect(usernameInput.value).toBe("admin");
    expect(passwordInput.value).toBe("password123");
  });
});
