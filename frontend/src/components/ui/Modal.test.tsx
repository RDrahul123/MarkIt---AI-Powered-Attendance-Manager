import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  it("renders when open", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen={false} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(container.querySelector(".fixed")).toBeNull();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );
    const closeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
