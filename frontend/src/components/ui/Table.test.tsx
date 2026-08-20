import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Table } from "@/components/ui/Table";

interface TestRow {
  id: number;
  name: string;
  value: number;
}

const testData: TestRow[] = [
  { id: 1, name: "Item A", value: 10 },
  { id: 2, name: "Item B", value: 20 },
];

const testColumns = [
  { key: "name", header: "Name", sortable: true },
  { key: "value", header: "Value", sortable: true, className: "text-right" },
];

describe("Table", () => {
  it("renders headers and rows", () => {
    render(
      <Table
        columns={testColumns}
        data={testData}
        keyExtractor={(item) => item.id}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
  });

  it("renders empty message when no data", () => {
    render(
      <Table
        columns={testColumns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyMessage="No items"
      />,
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={testColumns}
        data={testData}
        keyExtractor={(item) => item.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText("Item A"));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Item A" }),
    );
  });

  it("sorts by column when header is clicked", () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={testData}
        keyExtractor={(item) => item.id}
      />,
    );
    const nameHeader = screen.getByText("Name");
    fireEvent.click(nameHeader);
    const cells = container.querySelectorAll("tbody tr td:first-child");
    expect(cells[0].textContent).toBe("Item A");
    fireEvent.click(nameHeader);
    const sortedCells = container.querySelectorAll("tbody tr td:first-child");
    expect(sortedCells[0].textContent).toBe("Item B");
  });
});
