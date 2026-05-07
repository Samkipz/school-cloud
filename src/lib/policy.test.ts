import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canMutatePortfolioAsset,
  normalizeClassName,
  tagIntersectsLearningAreas,
  type PolicyActor,
} from "./policy";

function actor(p: Partial<PolicyActor> & Pick<PolicyActor, "effectiveRole">): PolicyActor {
  return {
    dbUserId: "u1",
    baseRole: "teacher",
    persona: "teacher",
    learningAreaNames: [],
    classAssignments: [],
    ...p,
  };
}

describe("normalizeClassName", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeClassName("  Red  "), "red");
    assert.equal(normalizeClassName(null), "");
  });
});

describe("tagIntersectsLearningAreas", () => {
  it("detects case-insensitive overlap", () => {
    const a = actor({
      effectiveRole: "teacher",
      learningAreaNames: ["mathematics", "english"],
    });
    assert.equal(tagIntersectsLearningAreas(a, ["Mathematics"]), true);
    assert.equal(tagIntersectsLearningAreas(a, ["Science"]), false);
  });
});

describe("canMutatePortfolioAsset", () => {
  const student = { id: "s1", gradeId: "g1", className: "Red" };
  const ctxBase = {
    uploadedBy: "other",
    tagNames: ["Mathematics"],
    studentIds: [student.id],
    studentRows: [student],
  };

  it("full admin can mutate any portfolio asset", () => {
    const a = actor({
      effectiveRole: "admin",
      baseRole: "admin",
      persona: "admin",
    });
    assert.equal(canMutatePortfolioAsset(a, ctxBase), true);
  });

  it("admin in teacher persona uses teacher rules", () => {
    const a = actor({
      effectiveRole: "teacher",
      baseRole: "admin",
      persona: "teacher",
      learningAreaNames: ["mathematics"],
    });
    assert.equal(canMutatePortfolioAsset(a, ctxBase), true);
  });

  it("scoped class teacher can mutate others in class", () => {
    const a = actor({
      effectiveRole: "teacher",
      classAssignments: [{ gradeId: "g1", classNameNorm: "red" }],
    });
    assert.equal(canMutatePortfolioAsset(a, ctxBase), true);
  });

  it("scoped class teacher cannot mutate outside class", () => {
    const a = actor({
      effectiveRole: "teacher",
      classAssignments: [{ gradeId: "g1", classNameNorm: "blue" }],
    });
    assert.equal(canMutatePortfolioAsset(a, ctxBase), false);
  });

  it("subject teacher can mutate when tags intersect", () => {
    const a = actor({
      effectiveRole: "teacher",
      learningAreaNames: ["mathematics"],
    });
    assert.equal(canMutatePortfolioAsset(a, ctxBase), true);
  });

  it("owner can mutate without assignments", () => {
    const a = actor({ effectiveRole: "teacher", dbUserId: "owner" });
    assert.equal(
      canMutatePortfolioAsset(a, {
        ...ctxBase,
        uploadedBy: "owner",
      }),
      true,
    );
  });
});
