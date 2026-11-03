import { describe, expect, it } from "vitest";
import { extractYearBounds, matchJob, normalizeText, type MatcherOptions } from "../src/matcher.ts";

const options: MatcherOptions = {
  maxYearsExperience: 2,
  useDescription: true,
  allowUnleveledTitles: false,
  includeInternships: false,
  extraRoleKeywords: [],
  excludeKeywords: [],
};

const matches = (title: string, description?: string, opts: Partial<MatcherOptions> = {}) =>
  matchJob({ title, description }, { ...options, ...opts }).matched;

describe("entry-level title variants that must match", () => {
  it.each([
    "Software Engineer, New Grad",
    "Software Engineer - New Grad 2027",
    "New Grad Software Engineer",
    "Software Engineer (NewGrad)",
    "Software Engineer, New Graduate",
    "New Graduate Software Developer",
    "Graduate Software Engineer",
    "Software Engineer - Graduate Program",
    "Software Engineer - University Graduate",
    "University Grad - Software Engineer",
    "Recent Graduate Full Stack Developer",
    "Fresh Graduate Web Developer",
    "Grad Software Developer",
    "Software Engineer, Early Career",
    "Software Engineer - Early-Career",
    "Early Talent Software Engineer",
    "Software Engineer, Class of 2027",
    "2027 New Grad Software Engineer",
    "Entry Level Software Engineer",
    "Entry-Level Full-Stack Developer",
    "Software Developer (Entry Level)",
    "Junior Software Engineer",
    "Jr. Full Stack Developer",
    "Junior Developer",
    "Junior Frontend Developer",
    "Junior Backend Engineer",
    "Junior React Developer",
    "Associate Software Engineer",
    "Associate Software Developer",
    "Software Engineer I",
    "Software Engineer 1",
    "Software Engineer I, Backend",
    "Software Development Engineer I",
    "SDE 1",
    "SDE I",
    "SWE I",
    "Software Engineer - Level 1",
    "Software Engineer Trainee",
    "Software Developer Apprentice",
    "Fresher Java Developer",
    "Campus Hire - Software Engineer",
    "Full Stack Engineer, New Grad",
    "Fullstack Developer - Junior",
    "Web Developer, Entry Level",
    "Junior Node.js Developer",
    "Junior C++ Developer",
    "Junior .NET Developer",
    "Mobile Software Engineer (New Grad)",
  ])("%s", (title) => {
    expect(matches(title)).toBe(true);
  });
});

describe("titles that must be rejected", () => {
  it.each([
    "Senior Software Engineer",
    "Sr. Full Stack Developer",
    "Staff Software Engineer",
    "Principal Software Engineer",
    "Lead Software Engineer",
    "Software Engineering Manager",
    "Director of Engineering",
    "Software Architect",
    "Software Engineer II",
    "Software Engineer III",
    "Software Engineer 2",
    "SDE II",
    "Senior Associate Software Engineer",
    "Junior Software Engineering Manager",
    "Software Engineer",
    "Full Stack Developer",
    "Software Engineer Intern",
    "Summer 2027 Software Engineering Internship",
    "Junior Accountant",
    "New Grad Mechanical Engineer",
    "Graduate Nurse",
    "Junior Sales Engineer - Python",
    "Application Support Engineer, New Grad",
    "Junior QA Engineer",
    "Business Development Associate",
    "Graduate Marketing Associate",
    "Associate Report Developer",
  ])("%s", (title) => {
    expect(matches(title)).toBe(false);
  });
});

describe("options", () => {
  it("accepts internships when enabled", () => {
    expect(matches("Software Engineer Intern", undefined, { includeInternships: true })).toBe(true);
  });

  it("keeps new-grad internship hybrids", () => {
    expect(matches("Software Engineer, New Grad / Intern Conversion")).toBe(true);
  });

  it("accepts unleveled titles only when allowed", () => {
    expect(matches("Software Engineer", undefined, { allowUnleveledTitles: true })).toBe(true);
    expect(
      matches("Software Engineer", "We need 5+ years of experience", {
        allowUnleveledTitles: true,
      }),
    ).toBe(false);
  });

  it("honors extra role keywords and exclude keywords", () => {
    expect(matches("Junior Data Engineer")).toBe(false);
    expect(
      matches("Junior Data Engineer", undefined, { extraRoleKeywords: ["data engineer"] }),
    ).toBe(true);
    expect(matches("Junior Java Developer", undefined, { excludeKeywords: ["java"] })).toBe(false);
  });
});

describe("description rules", () => {
  it("accepts a plain title when the description says entry level", () => {
    expect(
      matches("Software Engineer", "This is an entry-level position for recent graduates."),
    ).toBe(true);
  });

  it("accepts a plain title that asks for 0-1 years", () => {
    expect(matches("Software Engineer", "Requires 0-1 years of professional experience.")).toBe(
      true,
    );
  });

  it("rejects a plain title that does not prove it is junior", () => {
    expect(matches("Software Engineer", "You will build great things with our team.")).toBe(false);
  });

  it("rejects a junior title demanding 4+ years", () => {
    expect(
      matches("Junior Software Engineer", "Requires 4+ years of experience in backend development"),
    ).toBe(false);
  });

  it("trusts strong new-grad titles over stray year mentions", () => {
    expect(
      matches("Software Engineer, New Grad", "5+ years of experience in the industry is a plus"),
    ).toBe(true);
  });

  it("ignores 'no prior experience in <topic>' wording", () => {
    expect(matches("Software Engineer", "No prior experience in AI is required.")).toBe(false);
    expect(matches("Software Engineer", "No prior professional experience required.")).toBe(true);
  });

  it("does not treat 'mentor junior engineers' as an entry-level signal", () => {
    expect(
      matches("Software Engineer", "You will mentor junior engineers and lead design reviews."),
    ).toBe(false);
  });
});

describe("extractYearBounds", () => {
  it("reads plus and range forms", () => {
    expect(extractYearBounds("3+ years of experience")).toEqual({ min: 3, max: 3 });
    expect(extractYearBounds("0-2 years of experience")).toEqual({ min: 0, max: 0 });
    expect(
      extractYearBounds("2 to 4 years' experience with React and 5+ years of industry experience"),
    ).toEqual({
      min: 2,
      max: 5,
    });
  });

  it("ignores years that are not about experience", () => {
    expect(
      extractYearBounds("We were founded 10 years ago. A 4 year degree is required."),
    ).toBeNull();
  });
});

describe("normalizeText", () => {
  it("normalizes punctuation and tech names", () => {
    expect(normalizeText("Full-Stack Dev (C++ / C# / Node.js)")).toBe(
      "full stack dev cpp csharp nodejs",
    );
  });
});
