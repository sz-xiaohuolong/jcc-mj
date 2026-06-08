import { describe, expect, it } from "vitest";
import { createAugmentChoices } from "../engine/augmentEngine";
import { createSeededRandom } from "../utils/random";

describe("augmentEngine", () => {
  it("excludes augments that the player has already selected", () => {
    const choices = createAugmentChoices(createSeededRandom(12), 20, ["golden-ticket", "stable-econ"]);

    expect(choices.map((augment) => augment.id)).not.toContain("golden-ticket");
    expect(choices.map((augment) => augment.id)).not.toContain("stable-econ");
  });
});
