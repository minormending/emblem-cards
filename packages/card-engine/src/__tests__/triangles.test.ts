import { describe, it, expect } from "vitest";
import { getTriangleBonus, TRIANGLE_BONUS } from "../triangles.js";

describe("getTriangleBonus", () => {
  // Weapon triangle
  it("sword beats axe", () => {
    expect(getTriangleBonus("sword", "axe")).toBe(TRIANGLE_BONUS);
  });

  it("axe beats lance", () => {
    expect(getTriangleBonus("axe", "lance")).toBe(TRIANGLE_BONUS);
  });

  it("lance beats sword", () => {
    expect(getTriangleBonus("lance", "sword")).toBe(TRIANGLE_BONUS);
  });

  it("no bonus when disadvantaged (sword vs lance)", () => {
    expect(getTriangleBonus("sword", "lance")).toBe(0);
  });

  it("no bonus for same weapon (sword vs sword)", () => {
    expect(getTriangleBonus("sword", "sword")).toBe(0);
  });

  // Magic triangle
  it("fire beats wind", () => {
    expect(getTriangleBonus("fire", "wind")).toBe(TRIANGLE_BONUS);
  });

  it("wind beats thunder", () => {
    expect(getTriangleBonus("wind", "thunder")).toBe(TRIANGLE_BONUS);
  });

  it("thunder beats fire", () => {
    expect(getTriangleBonus("thunder", "fire")).toBe(TRIANGLE_BONUS);
  });

  it("no bonus when magic disadvantaged (fire vs thunder)", () => {
    expect(getTriangleBonus("fire", "thunder")).toBe(0);
  });

  // Cross-type and bow
  it("no bonus for physical vs magic (sword vs fire)", () => {
    expect(getTriangleBonus("sword", "fire")).toBe(0);
  });

  it("no bonus for bow vs anything", () => {
    expect(getTriangleBonus("bow", "sword")).toBe(0);
    expect(getTriangleBonus("bow", "fire")).toBe(0);
  });

  it("no bonus for anything vs bow", () => {
    expect(getTriangleBonus("lance", "bow")).toBe(0);
  });
});
