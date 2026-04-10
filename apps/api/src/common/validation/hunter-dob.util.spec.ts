import { isValidHunterDobYmdString } from "./hunter-dob.util";

describe("isValidHunterDobYmdString", () => {
  const now = new Date(2026, 3, 9);

  it("accepts exactly five years ago on same calendar day", () => {
    expect(isValidHunterDobYmdString("2021-04-09", now)).toBe(true);
  });

  it("rejects one day after five-years-ago boundary", () => {
    expect(isValidHunterDobYmdString("2021-04-10", now)).toBe(false);
  });

  it("rejects future dates", () => {
    expect(isValidHunterDobYmdString("2027-01-01", now)).toBe(false);
  });

  it("rejects invalid strings", () => {
    expect(isValidHunterDobYmdString("", now)).toBe(false);
    expect(isValidHunterDobYmdString("not-a-date", now)).toBe(false);
  });
});
