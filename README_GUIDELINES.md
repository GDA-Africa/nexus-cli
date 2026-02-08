# 📝 GDA README Standards

> **Version 2.0** — Optimized for npm-first impressions and CLI tools.
>
> These guidelines govern how READMEs are written across all GDA Africa projects.
> The goal: a developer lands on your npm page or GitHub repo and **understands what
> your project does, how to use it, and why they should care** — in under 60 seconds.

---

## 🧠 Philosophy

1. **npm is your storefront.** Most developers discover packages on npm, not GitHub. The README must sell the project in the first scroll.
2. **Scan-first.** Assume the reader will skim. Headers, tables, badges, bold text, and emoji are your primary tools. Paragraphs are secondary.
3. **Copy-paste ready.** Every command and code block must work when pasted directly. No `<placeholders>` in the final README.
4. **Right-sized.** Include what the reader *needs*. A CLI tool doesn't need an API Reference section. A library doesn't need a deployment section. Choose sections that match your project type.
5. **Always current.** Outdated test counts, unchecked roadmap items that are done, and stale badges erode trust. Update the README with every release.

---

## 📋 Section Menu

Not every project needs every section. Use this table to pick the right ones.

| # | Section | CLI Tool | Library | API / Fullstack | Required? |
|---|---------|:--------:|:-------:|:---------------:|-----------|
| 1 | [Hero Header](#1-hero-header) | ✅ | ✅ | ✅ | **Always** |
| 2 | [About GDA Africa](#2-about-gda-africa) | ✅ | ✅ | ✅ | **Always** |
| 3 | [Why \<Project\>?](#3-why-project) | ✅ | ✅ | ✅ | **Always** |
| 4 | [Features](#4-features) | ✅ | ✅ | ✅ | **Always** |
| 5 | [Quick Start](#5-quick-start) | ✅ | ✅ | ✅ | **Always** |
| 6 | [Usage / Commands](#6-usage--commands) | ✅ | ✅ | — | When applicable |
| 7 | [What You Get](#7-what-you-get) | ✅ | — | — | Generators/scaffolders |
| 8 | [API Reference](#8-api-reference) | — | ✅ | ✅ | Libraries & APIs only |
| 9 | [Architecture](#9-architecture) | — | — | ✅ | Complex systems only |
| 10 | [Roadmap](#10-roadmap) | ✅ | ✅ | ✅ | **Always** |
| 11 | [Tech Stack](#11-tech-stack) | optional | optional | ✅ | APIs & complex projects |
| 12 | [Contributing](#12-contributing) | ✅ | ✅ | ✅ | **Always** (keep brief) |
| 13 | [Footer](#13-footer) | ✅ | ✅ | ✅ | **Always** |

**Sections intentionally NOT required for CLI tools:** Project Structure (internal detail, not user-facing), Security (generic for scaffolders), Deployment (users `npm install`, they don't deploy your CLI), Integration Guide (bake it into Usage instead).

---

## Section Specifications

### 1. Hero Header

The first thing a developer sees on npm. Must convey **what**, **who**, and **why** instantly.

```markdown
<div align="center">

# <emoji> <Project Name>

### <Subtitle — 3-6 words>

**<One-sentence pitch mentioning [GDA Africa](https://github.com/GDA-Africa) and the core value.>**

[![Badge](https://img.shields.io/badge/...)]()
...

---

*<Tagline — punchy, under 10 words.>*

</div>
```

**Rules:**
- Title: single relevant emoji + project name
- Subtitle: `h3`, no more than 6 words
- Pitch: **bold**, mentions GDA Africa as a link, states value proposition
- 3–5 badges (see [Badge Standards](#-badge-standards))
- Tagline: italicized, separated by `---`, under 10 words
- Entire block wrapped in `<div align="center">`

---

### 2. About GDA Africa

2–3 sentences. Ground the reader in organizational context.

```markdown
## 🌍 About GDA Africa

**GDA (Glenhalton Digital Agency)** is building the digital infrastructure for
Africa's next generation of products and services. <Project> is <role> — <what it does>.
```

**Rules:**
- Always `🌍` emoji
- Bold "GDA (Glenhalton Digital Agency)" on first mention
- Connect the project to GDA's mission
- Max 3 sentences — context, not a manifesto

---

### 3. Why \<Project\>?

Problem → solution table. The reader decides to keep reading (or bounce) here.

```markdown
## 🎯 Why NEXUS?

<One sentence framing the problem space.>

| Problem | <Project> Solution |
|---|---|
| 🔐 Problem | **Solution** |
| ...        | ...          |
```

**Rules:**
- Always `🎯` emoji
- One framing sentence, then the table
- 3–5 rows (not 6+ — trim to the strongest points)
- Each problem row starts with an emoji
- Solutions are bold and concise — one line, no paragraphs

---

### 4. Features

Two-column HTML table for scannability.

```markdown
## ✨ Features

<table>
<tr>
<td width="50%">

### Category A
- ⚡ **Feature** — Brief description

</td>
<td width="50%">

### Category B
- 🏗️ **Feature** — Brief description

</td>
</tr>
</table>
```

**Rules:**
- Always `✨` emoji
- Two columns, each `width="50%"`
- 4–6 features per column
- Each feature: emoji + **bold name** + ` — ` + short description

---

### 5. Quick Start

**For CLI tools / npm packages:** Lead with the install command — that's what visitors want.

```markdown
## 🚀 Quick Start

### Install

\`\`\`bash
npm install -g <package-name>
\`\`\`

### Create a Project

\`\`\`bash
<main command>
\`\`\`

### Run It

\`\`\`bash
cd my-project
npm run dev
\`\`\`
```

**For libraries / APIs:** Use the 4-step Clone → Configure → Run → Verify format.

**Rules:**
- Always `🚀` emoji
- npm packages: **install command first** — no clone/build steps for end users
- Every code block is copy-pasteable
- Show the interactive experience or output if it's impressive
- Keep it under 30 lines total

---

### 6. Usage / Commands

For CLI tools: a compact command reference. For libraries: core usage examples.

```markdown
## 📖 Usage

| Command | Description |
|---|---|
| \`tool init [name]\` | Does X |
| \`tool adopt [path]\` | Does Y |
| \`tool --version\` | Display version |
| \`tool --help\` | Show help |
```

**Rules:**
- Always `📖` emoji
- CLI tools: table format, one row per command
- Libraries: 2–3 short code examples showing the most common patterns
- Don't duplicate Quick Start content

---

### 7. What You Get

For generators / scaffolders: show what the tool produces.

```markdown
## 📦 What You Get

<Short sentence: "Every generated project includes:">

| Output | Description |
|---|---|
| \`src/\` | Source code with framework boilerplate |
| \`.nexus/docs/\` | 8 AI-optimized documentation files |
| \`tests/\` | Test infrastructure and example tests |
| ... | ... |
```

**Rules:**
- Always `📦` emoji
- Table format with output path + description
- Only include this for tools that generate files/projects
- 6–10 rows max — the highlights, not every single file

---

### 8. API Reference

**Only for libraries and APIs.** Not for CLI tools.

**Rules:**
- Always `📡` emoji
- Each endpoint: method + path as `h3`
- Request body as JSON, fields as table
- Response status table
- 2+ language examples (cURL + one other)

---

### 9. Architecture

**Only for complex systems** (APIs, microservices, multi-layer apps). Skip for CLI tools and simple libraries.

**Rules:**
- Always `🏗️` emoji
- Unicode box-drawing characters
- 70–80 char width max
- Label every arrow

---

### 10. Roadmap

Checkbox progress list. Keep it tight.

```markdown
## 🗺️ Roadmap

- [x] Completed feature
- [ ] Planned feature
```

**Rules:**
- Always `🗺️` emoji
- Completed first, then planned
- 8–12 items total
- Single line per item
- **Update checkboxes with every release** — stale roadmaps destroy credibility

---

### 11. Tech Stack

Clean two-column table. Optional for CLI tools (readers care about what the tool *does*, not what it's built *with*).

**Rules:**
- Always `🛠️` emoji
- Bold the component name
- Include versions

---

### 12. Contributing

Brief — point to `CONTRIBUTING.md` for details.

```markdown
## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

\`\`\`bash
git clone https://github.com/GDA-Africa/<repo>.git
cd <repo> && yarn install
yarn lint && yarn test
\`\`\`
```

**Rules:**
- Always `🤝` emoji
- Link to `CONTRIBUTING.md`
- Show the 3-command setup (clone, install, test)
- Don't repeat the full contribution guide in the README

---

### 13. Footer

Centered GDA branding.

```markdown
<div align="center">

---

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)** — Powering Africa's Digital Future

*<One-sentence project context.>*

---

</div>
```

**Rules:**
- Centered with `<div align="center">`
- "Built with ❤️ by GDA Africa" + "Powering Africa's Digital Future"
- Second line: italicized, project-specific

---

## 🎨 Formatting Rules

### Spacing
- Two blank lines before `## h2` headers in source
- One blank line after every header before content
- `---` between major sections

### Headers
- `#` — used **once**, in the hero
- `##` — major sections (always with emoji prefix)
- `###` — sub-sections
- `####` — rarely, only when genuinely needed

### Emoji
- Every `##` header starts with an emoji
- Feature lists use emoji as bullet decorators
- No emoji in `###` or lower headers
- No emoji in table cells (except Problem column in "Why" table)

### Tables
- Prefer tables over bullet lists for structured data
- Bold the left column when it's a label
- Use ✅/❌ for boolean fields

### Code Blocks
- Always specify language hint (`bash`, `typescript`, `json`, etc.)
- Commands must be copy-pasteable
- Show expected output as `# → comment`

---

## 🏷️ Badge Standards

Use [Shields.io](https://shields.io) with `for-the-badge` style.

### Required Badges (in order)

| Badge | Example |
|---|---|
| **Primary Language** | TypeScript, Python |
| **Framework/Runtime** | Node.js, Next.js, FastAPI |
| **Tests** | `105 Passing` (update with releases!) |
| **License** | Apache 2.0, MIT |
| **PRs Welcome** | Always include for open source |

### Color Reference

| Technology | Hex |
|---|---|
| TypeScript | `3178C6` |
| Python | `3776AB` |
| Node.js | `339933` |
| Next.js | `000000` |
| React | `61DAFB` |

---

## 🗣️ Tone & Voice

| ✅ Do | ❌ Don't |
|---|---|
| Professional but approachable | Overly casual or slangy |
| Confident and direct | Apologetic or hedging |
| Action-oriented ("Install", "Run", "Create") | Passive ("can be installed...") |
| Concise — one idea per sentence | Verbose paragraphs |
| Use "you" to address the reader | Use "we" or "I" (except footer) |
| Celebrate what's built | Apologize for what's missing |

---

## 🚫 Anti-Patterns

| Anti-Pattern | Do This Instead |
|---|---|
| 500+ line README for a CLI tool | Keep it under 250 lines — trim to essentials |
| Full project structure tree | Skip it — users don't need your internal file layout |
| Internal type/interface tables | Only expose what users interact with directly |
| Security section for scaffolding tools | Remove — it's not relevant to the user |
| Deployment section for npm packages | Users `npm install`, they don't deploy your tool |
| Outdated test counts or roadmap items | Update with every release |
| Clone/build Quick Start for an npm package | Lead with `npm install -g` |
| Giant ASCII architecture diagram | Only for complex multi-service systems |

---

## ✅ Pre-Merge Checklist

```
[ ] Hero: centered, title, subtitle, pitch, badges, tagline
[ ] About GDA: connects project to mission (2-3 sentences)
[ ] Why: problem/solution table (3-5 rows)
[ ] Features: two-column HTML table
[ ] Quick Start: starts with install command (for npm packages)
[ ] Roadmap: checkboxes updated, no stale items
[ ] Footer: centered GDA branding
[ ] All commands copy-pasteable
[ ] All code blocks have language hints
[ ] Every ## section has emoji prefix
[ ] Badge test count matches actual count
[ ] Renders correctly on GitHub and npm
```

---

<div align="center">

---

**GDA README Standards v2.0** — Maintained by the GDA Engineering Team

*Every repo is a first impression. Make it count.*

---

</div>
