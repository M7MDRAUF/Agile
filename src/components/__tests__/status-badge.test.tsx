import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  StatusBadge,
  PriorityBadge,
  HealthBadge,
  TestStatusBadge,
} from "@/components/status-badge";

describe("status badges", () => {
  it("renders humanized work item status", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders priority", () => {
    render(<PriorityBadge priority="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("renders project health", () => {
    render(<HealthBadge health="on_track" />);
    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("renders test status", () => {
    render(<TestStatusBadge status="passed" />);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });
});
