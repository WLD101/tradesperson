import { expect, test, describe, beforeEach } from "vitest";
import { AreaCalculatorService } from "./area-calculator.service";

describe("AreaCalculatorService", () => {
  let service: AreaCalculatorService;

  beforeEach(() => {
    service = new AreaCalculatorService();
  });

  test("1. Rectangle", () => {
    const result = service.calculateComponentArea({ type: "RECTANGLE", length: 4.25, width: 3.10 });
    expect(result.toNumber()).toBe(13.175);
  });

  test("2. Triangle", () => {
    const result = service.calculateComponentArea({ type: "TRIANGLE", base: 3, height: 4 });
    expect(result.toNumber()).toBe(6);
  });

  test("3. Semicircle", () => {
    const result = service.calculateComponentArea({ type: "SEMICIRCLE", radius: 2 });
    expect(result.toNumber()).toBeCloseTo(Math.PI * 2, 4);
  });

  test("4. Circle", () => {
    const result = service.calculateComponentArea({ type: "CIRCLE", radius: 2 });
    expect(result.toNumber()).toBeCloseTo(Math.PI * 4, 4);
  });

  test("5. Multiple additions", () => {
    const r1 = service.calculateComponentArea({ type: "RECTANGLE", length: 5, width: 4 }); // 20
    const r2 = service.calculateComponentArea({ type: "RECTANGLE", length: 2, width: 2 }); // 4
    const { netArea, grossArea, deductions } = service.calculateRoomTotals([
      { operation: "ADD", area: r1 },
      { operation: "ADD", area: r2 },
    ]);
    expect(netArea.toNumber()).toBe(24);
    expect(grossArea.toNumber()).toBe(24);
    expect(deductions.toNumber()).toBe(0);
  });

  test("6. Alcove", () => {
    const result = service.calculateComponentArea({ type: "ALCOVE", length: 1, width: 2 });
    expect(result.toNumber()).toBe(2);
  });

  test("7. Column deduction", () => {
    const result = service.calculateComponentArea({ type: "COLUMN", length: 0.5, width: 0.5 });
    expect(result.toNumber()).toBe(0.25);
  });

  test("8. Combined additions and deductions", () => {
    const r1 = service.calculateComponentArea({ type: "RECTANGLE", length: 5, width: 4 }); // 20
    const alcove = service.calculateComponentArea({ type: "ALCOVE", length: 1, width: 2 }); // 2
    const column = service.calculateComponentArea({ type: "COLUMN", length: 0.5, width: 0.5 }); // 0.25

    const { netArea, grossArea, deductions } = service.calculateRoomTotals([
      { operation: "ADD", area: r1 },
      { operation: "ADD", area: alcove },
      { operation: "DEDUCT", area: column },
    ]);
    expect(netArea.toNumber()).toBe(21.75);
    expect(grossArea.toNumber()).toBe(22);
    expect(deductions.toNumber()).toBe(0.25);
  });

  test("9. Waste at 0%", () => {
    const r1 = service.calculateComponentArea({ type: "RECTANGLE", length: 5, width: 4 });
    const { wasteAdjustedArea } = service.calculateRoomTotals([{ operation: "ADD", area: r1 }], 0);
    expect(wasteAdjustedArea.toNumber()).toBe(20);
  });

  test("10. Non-zero waste", () => {
    const r1 = service.calculateComponentArea({ type: "RECTANGLE", length: 5, width: 4 });
    const { wasteAdjustedArea } = service.calculateRoomTotals([{ operation: "ADD", area: r1 }], 10);
    expect(wasteAdjustedArea.toNumber()).toBe(22);
  });

  test("11. Decimal rounding", () => {
    const r1 = service.calculateComponentArea({ type: "RECTANGLE", length: 1.1111, width: 2.2222 }); // 2.46908642
    const { netArea, wasteAdjustedArea } = service.calculateRoomTotals([{ operation: "ADD", area: r1 }], 15);
    
    // Net is rounded to 4 decimals: 2.4691
    expect(netArea.toNumber()).toBe(2.4691);
    
    // Adjusted: 2.4691 * 1.15 = 2.839465 -> 2.8395
    expect(wasteAdjustedArea.toNumber()).toBe(2.8395);
  });

  test("12. Negative dimension rejection", () => {
    expect(() => service.calculateComponentArea({ type: "RECTANGLE", length: -5, width: 4 }))
      .toThrow("Invalid dimension length: must be positive, finite, and reasonable (<1000)");
  });

  test("13. Zero dimension rejection", () => {
    expect(() => service.calculateComponentArea({ type: "RECTANGLE", length: 5, width: 0 }))
      .toThrow("Invalid dimension width: must be positive, finite, and reasonable (<1000)");
  });

  test("14. Missing dimensions", () => {
    expect(() => service.calculateComponentArea({ type: "RECTANGLE", length: 5 } as any))
      .toThrow("Missing required dimension: width");
  });

  test("15. Incompatible dimensions", () => {
    expect(() => service.calculateComponentArea({ type: "OCTAGON", length: 5 } as any))
      .toThrow("Unsupported shape for area calculation.");
  });

  test("16. Deduction exceeding additions", () => {
    const r1 = service.calculateComponentArea({ type: "RECTANGLE", length: 2, width: 2 }); // 4
    const column = service.calculateComponentArea({ type: "COLUMN", length: 3, width: 3 }); // 9

    expect(() => service.calculateRoomTotals([
      { operation: "ADD", area: r1 },
      { operation: "DEDUCT", area: column },
    ])).toThrow("Net area cannot be negative (deductions exceed additions)");
  });

  test("17. Excessive input rejection", () => {
    expect(() => service.calculateComponentArea({ type: "RECTANGLE", length: 5000, width: 4 }))
      .toThrow("Invalid dimension length: must be positive, finite, and reasonable (<1000)");
  });

  test("18. Stair area", () => {
    const result = service.calculateComponentArea({
      type: "STAIR",
      width: 1,
      tread: 0.25,
      riser: 0.18,
      count: 12,
    });
    expect(result.toNumber()).toBe(5.16);
  });

  test("19. Landing area", () => {
    const result = service.calculateComponentArea({ type: "LANDING", length: 1.8, width: 0.9 });
    expect(result.toNumber()).toBe(1.62);
  });

  test("20. Corridor area", () => {
    const result = service.calculateComponentArea({ type: "CORRIDOR", length: 5.5, width: 1.2 });
    expect(result.toNumber()).toBe(6.6);
  });

  test("21. Non-finite values are rejected", () => {
    expect(() => service.calculateComponentArea({ type: "RECTANGLE", length: Number.POSITIVE_INFINITY, width: 2 }))
      .toThrow("Invalid dimension length: must be positive, finite, and reasonable (<1000)");
  });

  test("22. Negative waste is rejected", () => {
    const area = service.calculateComponentArea({ type: "RECTANGLE", length: 2, width: 2 });
    expect(() => service.calculateRoomTotals([{ operation: "ADD", area }], -1)).toThrow("Invalid wastePercentage");
  });
});
