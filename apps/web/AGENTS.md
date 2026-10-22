# Frontend Development Guidelines

Follow the repository guidelines and read `docs/web/README.md` before changing related behavior.

## Layout and Copy

> Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.

- Prefer spacing, grouping, hierarchy and existing UI patterns to explain relationships and the next action.
- Do not add subtitles, badges, eyebrow labels, step numbers or helper sentences that repeat a nearby heading, control or example.
- Keep copy that users need to act correctly: prerequisites, meaningful distinctions, errors and action feedback. Preserve accessible names even when visible explanatory text is removed.
- Reuse the shared layout, navigation, search, sidebar and theme styles for new pages.
- Reuse existing project color definitions and UnoCSS palette utilities for site controls; do not introduce page-specific brand colors. The existing pink accent uses `pink-600`, and the shared hero background is defined in `src/styles/layout.css`.
- Let the shared Layout own content width and outer gutters. Align page sections with existing headings and footer content; avoid stacking page-specific max-widths and horizontal padding. Use the project's breakpoints and consistent panel padding, and verify alignment immediately below and above breakpoint boundaries, including with the sidebar open.
