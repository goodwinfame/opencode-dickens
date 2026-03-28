---
description: Write the next chapter of your novel. Automatically determines which chapter to write based on current progress.
agent: novelist
---

Write the next chapter of the novel. Follow the standard Dickens workflow:

1. Check current progress with `dickens_status`
2. Determine the next chapter number from `.writer-state.json`
3. Read the arc plan for context
4. Build writing context (recent summaries, character profiles, scene plan)
5. Delegate to @scribe with full context injection
6. After writing, invoke @editor for review
7. If review passes, invoke @chronicler to generate summary and update trackers
8. Save checkpoint

Project path: $ARGUMENTS
