# Claude instructions for passaggio-web

## Marc's permanent global rules (all of Claude, every repo and session)
- Give every time in Marc's local time: Sydney (AEDT, UTC+11; AEST, UTC+10). Convert UTC first.
- Always open links in an external browser, never in Claude's built-in browser pane.
- **Visuals are Codex's, never Claude's (Marc, Oct 29).** Claude never designs, redesigns or
  implements visuals in any build: logo, icons, layout, spacing, colours, fonts, animation,
  artwork or the look of a screen, and neither do agents Claude starts. If a task would touch
  anything visual, stop and ask Marc first under a "⚠️ VISUAL CHANGE: needs your OK" heading,
  and show him the attempt before it goes near a branch, PR or build.
- **Ask Matt first; brief agents with writing-for-agents (Marc, Oct 29).** Before writing code or
  directing any other agent (Codex, sub-agents, other sessions), run Matt Pocock's `ask-matt` to
  pick the flow, and write every delegation brief with his `writing-for-agents` skill. Here,
  run the repo's own `ask-matt` skill (`.claude/skills/ask-matt`) yourself; no need to ask Marc.
