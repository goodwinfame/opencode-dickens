---
description: Start an automatic writing loop. Continuously writes chapters until the target is reached or you interrupt.
agent: novelist
---

Start the Dickens automatic writing loop. This will continuously write chapters following the full workflow:

For each chapter:
1. Build context from summaries, character profiles, and arc plan
2. Delegate writing to @scribe
3. Review with @editor (quality gate: score >= 6 to proceed)
4. Generate summary with @chronicler
5. Update trackers and checkpoint
6. Report progress
7. Proceed to next chapter

The loop will pause at:
- Arc boundaries (for @editor arc review and @architect outline adjustment)
- Quality gate failures (Editor score < 6)
- User interruption

Arguments format: `--chapters N` to write N chapters, or `--arc` to write until end of current arc.

Default: write 5 chapters then pause for review.

$ARGUMENTS
