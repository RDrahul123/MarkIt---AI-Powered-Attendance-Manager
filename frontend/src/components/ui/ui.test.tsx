import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-600");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Username" placeholder="Enter name" />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "test" } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("Select", () => {
  it("renders options correctly", () => {
    const options = [
      { value: "1", label: "Option 1" },
      { value: "2", label: "Option 2" },
    ];
    render(
      <Select
        label="Choose"
        value=""
        onChange={() => {}}
        options={options}
      />,
    );
    const select = screen.getByRole("combobox");
    fireEvent.mouseDown(select);
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("renders title and children", () => {
    render(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    );
    expect(screen.getByText("Test Card")).toBeInTheDocument();
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("renders children with correct variant", () => {
    render(<Badge variant="present">Present</Badge>);
    expect(screen.getByText("Present")).toBeInTheDocument();
    expect(screen.getByText("Present")).toHaveClass("bg-green-100");
  });

  it("renders absent variant", () => {
    render(<Badge variant="absent">Absent</Badge>);
    expect(screen.getByText("Absent")).toHaveClass("bg-red-100");
  });
});
