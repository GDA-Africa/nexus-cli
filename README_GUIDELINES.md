<div align="center">

# 📐 GDA README Standards & Guidelines

### The Definitive Reference for Writing World-Class README Files

**Every GDA Africa repository must ship with a README that reflects the quality, professionalism, and ambition of the organization. This document defines the exact structure, style, and standards to follow.**

---

*If the README isn't excellent, the project isn't ready.*

</div>

---

## Table of Contents

1. [Philosophy](#-philosophy)
2. [Required Sections (Ordered)](#-required-sections-ordered)
3. [Section-by-Section Specification](#-section-by-section-specification)
4. [Visual & Formatting Rules](#-visual--formatting-rules)
5. [Badge Standards](#-badge-standards)
6. [Markdown Patterns & Components](#-markdown-patterns--components)
7. [Tone & Voice](#-tone--voice)
8. [Anti-Patterns (What NOT to Do)](#-anti-patterns-what-not-to-do)
9. [Checklist Before Merging](#-checklist-before-merging)
10. [Reference Template](#-reference-template)

---

## 💡 Philosophy

A GDA README is not just documentation — it is the **front door** of the project. It must:

- **Sell the project** in the first 5 seconds (hero section)
- **Explain the "why"** before the "how" (motivation before mechanics)
- **Be scannable** — a busy developer should find any answer in under 10 seconds
- **Be complete** — nothing should require asking the team a question
- **Be beautiful** — visual structure, tables, emoji section headers, and diagrams are mandatory
- **Reflect GDA's brand** — professional, ambitious, Africa-forward

> **Rule of thumb:** If someone reads only the README and nothing else, they should be able to understand, install, use, test, deploy, and contribute to the project.

---

## 📋 Required Sections (Ordered)

Every GDA README **must** include the following sections in this exact order. Optional sections are marked with `*`.

| # | Section | Purpose |
|---|---|---|
| 1 | **Hero Header** | Centered title, tagline, badges, one-liner |
| 2 | **About GDA Africa** | Organization context and project's role |
| 3 | **Why \<Project\>?** | Problem/solution table — the business case |
| 4 | **Features** | Two-column table with grouped capabilities |
| 5 | **Architecture** | ASCII or visual diagram of system design |
| 6 | **Project Structure** | Annotated file tree |
| 7 | **Quick Start** | Prerequisites → Clone → Configure → Run → Verify |
| 8 | **API Reference** | Endpoints, schemas, status codes, multi-language examples |
| 9 | **Security** | Table of security layers and implementations |
| 10 | **Testing** | Commands + test suite coverage table |
| 11 | **Deployment** | Step-by-step production deployment |
| 12 | **Integration Guide*** | How other projects/teams connect to this service |
| 13 | **Roadmap** | Checkbox-style progress tracker |
| 14 | **Tech Stack** | Clean table of all technologies used |
| 15 | **Footer** | Centered GDA branding and contact line |

> **Do not skip sections.** If a section doesn't apply yet (e.g., no API endpoints), include the header with a note like *"Coming in v2 — see [Roadmap](#-roadmap)."*

---

## 📝 Section-by-Section Specification

### 1. Hero Header

The first thing anyone sees. It must be **centered** and contain exactly:

```markdown
<div align="center">

# 📦 Project Name

### Short Descriptive Subtitle

**A one-sentence pitch mentioning [GDA Africa](https://github.com/GDA-Africa) and the project's core value.**

[![Badge1](shield-url)](link)
[![Badge2](shield-url)](link)
...

---

*A memorable italicized tagline — one line, punchy, quotable.*

</div>
```

**Rules:**
- Title uses a single relevant emoji + the project name
- Subtitle is an `h3` (`###`) — no more than 6 words
- Pitch sentence is **bold**, mentions GDA Africa as a link, and states the value proposition
- Minimum 3 badges, maximum 7 (see [Badge Standards](#-badge-standards))
- Tagline is italicized, separated by `---`, and under 10 words
- The entire block is wrapped in `<div align="center">`

---

### 2. About GDA Africa

A short paragraph (2–4 sentences) explaining GDA's mission and how this specific project fits into the larger ecosystem. This grounds the reader in organizational context.

```markdown
## 🌍 About GDA Africa

**GDA (Glenhalton Digital Agency)** is building the digital infrastructure for Africa's
next generation of products and services. <Project> is <role within GDA> — <what it does
for the organization>.
```

**Rules:**
- Always use the `🌍` emoji for this section
- Always bold "GDA (Glenhalton Digital Agency)" on first mention
- Connect the specific project to GDA's larger mission
- Keep it under 4 sentences — this is context, not a manifesto

---

### 3. Why \<Project\>?

A **problem → solution table** that makes the value proposition immediately scannable.

```markdown
## 🎯 Why <Project>?

<One sentence framing the problem space.>

| Problem | <Project> Solution |
|---|---|
| 🔐 Problem description | Solution description |
| 📧 Problem description | Solution description |
| ...                     | ...                  |
```

**Rules:**
- Always use the `🎯` emoji
- Open with one framing sentence before the table
- Table must have 4–6 rows
- Each problem row starts with a relevant emoji
- Solutions are concise — one line each, no paragraphs

---

### 4. Features

A **two-column HTML table** grouping features into logical categories.

```markdown
## ✨ Features

<table>
<tr>
<td width="50%">

### Category A
- ⚡ **Feature** — Brief description
- 🔒 **Feature** — Brief description

</td>
<td width="50%">

### Category B
- 🏗️ **Feature** — Brief description
- 🗄️ **Feature** — Brief description

</td>
</tr>
</table>
```

**Rules:**
- Always use `✨` emoji
- Exactly two columns, each `width="50%"`
- Each column has an `h3` category title
- Each feature: emoji + **bold name** + ` — ` + description
- 4–6 features per column
- Category names should contrast (e.g., "Core Capabilities" vs "Production Ready", "Developer Experience" vs "Operations")

---

### 5. Architecture

An **ASCII box-and-arrow diagram** showing the system's high-level data flow.

```markdown
## 🏗️ Architecture

```
┌─────────────────────────┐
│     COMPONENT NAME      │
│   Supporting detail      │
└───────────┬─────────────┘
            │  Protocol / Action
            ▼
┌─────────────────────────┐
│     NEXT COMPONENT      │
└─────────────────────────┘
```
```

**Rules:**
- Always use `🏗️` emoji
- Use Unicode box-drawing characters (`┌ ─ ┐ │ └ ┘ ┬ ▼ →`)
- Show the full data flow from user/client to final destination
- Label every arrow with the protocol or action (e.g., `HTTPS POST`, `SMTP/STARTTLS`)
- Include internal sub-components where the architecture has meaningful layers
- Keep it readable at 70–80 character width (fits GitHub without horizontal scroll)

---

### 6. Project Structure

An **annotated file tree** showing every meaningful file and directory.

```markdown
## 📁 Project Structure

```
project-name/
├── src/
│   ├── main.py              # Entry point — brief description
│   └── utils.py             # Brief description
├── tests/
│   └── test_main.py         # Brief description
├── deploy/
│   └── Dockerfile           # Brief description
├── requirements.txt         # Dependencies
└── README.md                # You are here
```
```

**Rules:**
- Always use `📁` emoji
- Use `├──`, `└──`, and `│` tree characters
- Every file gets a `# inline comment` explaining its purpose
- Group by directory with blank lines between logical groups
- Include only source-controlled files (no `.env`, `node_modules`, `__pycache__`)

---

### 7. Quick Start

A numbered, copy-paste-ready setup guide.

```markdown
## 🚀 Quick Start

### Prerequisites
- **Runtime** (version)
- **Package manager**
- Any external services needed

### 1. Clone & Setup
```bash
git clone https://github.com/GDA-Africa/<repo>.git
cd <repo>
<environment setup commands>
<dependency install commands>
```

### 2. Configure Environment
```env
KEY=value
ANOTHER_KEY=value
```

### 3. Run the Server
```bash
<development run command>
<production run command>
```

### 4. Verify
```bash
<health check command>
# → expected output
```
```

**Rules:**
- Always use `🚀` emoji
- Prerequisites listed as a bullet list with **bold** names and versions
- Exactly 4 sub-steps: Clone → Configure → Run → Verify
- Every command block is copy-pasteable (no `<placeholders>` in actual README — use realistic defaults)
- Include both development and production run commands
- Verify step shows the exact expected output as a comment
- Link to Swagger/docs UI if applicable

---

### 8. API Reference

Every endpoint fully documented with schemas, status codes, and **multi-language examples**.

```markdown
## 📡 API Reference

### Base URL
| Environment | URL |
|---|---|
| Production | `https://...` |
| Development | `http://localhost:PORT` |

---

### `METHOD /path` — Human Name

Description of what the endpoint does.

**Request:**
```json
{ ... }
```

| Field | Type | Required | Description |
|---|---|---|---|
| `field` | `type` | ✅/❌ | Description |

**Responses:**
| Status | Description |
|---|---|
| `200 OK` | Success response |
| `400 Bad Request` | Validation error |

**Example — cURL:**
```bash
curl -X POST ...
```

**Example — Python:**
```python
import httpx
...
```

**Example — JavaScript:**
```javascript
const response = await fetch(...)
...
```
```

**Rules:**
- Always use `📡` emoji
- Start with a Base URL table (production + development)
- Each endpoint: method + path in backtick code format as an `h3`
- Request body shown as formatted JSON
- Field table with Type, Required (✅/❌ emoji), and Description columns
- Response table covering all status codes
- **Minimum 3 language examples**: cURL, Python, JavaScript
- Separate endpoints with `---` horizontal rules

---

### 9. Security

A **table** mapping security layers to their implementations.

```markdown
## 🔐 Security

| Layer | Implementation |
|---|---|
| **Layer Name** | How it's implemented — one sentence. |
```

**Rules:**
- Always use `🔐` emoji
- Table format only — no paragraphs
- Cover: authentication, encryption (in-transit & at-rest), input validation, audit logging, secrets management
- Bold the layer name in the left column
- Be specific about implementations (e.g., "TLS 1.2+ via Let's Encrypt" not just "encryption")

---

### 10. Testing

Commands and a coverage table explaining what each suite tests.

```markdown
## 🧪 Testing

<One sentence about the testing philosophy (e.g., TDD).>

```bash
# Run all tests
<command>

# Run with coverage
<command>

# Run specific suite
<command> tests/test_specific.py
```

### Test Coverage

| Suite | Covers |
|---|---|
| `test_file.py` | What this suite validates |
```

**Rules:**
- Always use `🧪` emoji
- State the testing philosophy (TDD, BDD, etc.) in one sentence
- Show the 3 most common test commands (all, coverage, specific)
- Include a table mapping every test file to what it covers
- Commands must be copy-pasteable

---

### 11. Deployment

Step-by-step production deployment.

```markdown
## 🚢 Deployment

### <Method Name>
```bash
<deployment command>
```

<Numbered list explaining what the command/script does.>

### Environment Variables (Production)

| Variable | Description | Default |
|---|---|---|
| `VAR_NAME` | What it controls | `default` or `—` |
```

**Rules:**
- Always use `🚢` emoji
- If a deployment script exists, show the single command first, then explain the steps
- Always include an environment variable table with Variable, Description, and Default columns
- Use `—` (em dash) for variables with no default (required values)

---

### 12. Integration Guide (if applicable)

How other projects connect to this service.

**Rules:**
- Always use `🔌` emoji
- Include at least one copy-paste code example
- Link to a separate detailed `integration.md` if the guide is extensive
- Show the most common integration pattern first

---

### 13. Roadmap

A checkbox-style progress list.

```markdown
## 🗺️ Roadmap

- [x] Completed feature
- [x] Another completed feature
- [ ] Planned feature
- [ ] Future feature
```

**Rules:**
- Always use `🗺️` emoji
- Completed items first (`[x]`), then planned (`[ ]`)
- 8–15 items total
- Each item is a single line — no nested descriptions
- Order planned items by priority (most likely next → most distant)

---

### 14. Tech Stack

A clean two-column table.

```markdown
## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Category** | Specific technology + version |
```

**Rules:**
- Always use `🛠️` emoji
- Bold the component/category name
- Include version numbers where applicable
- Cover: runtime, framework(s), database, ORM, testing, server, deployment

---

### 15. Footer

Centered GDA branding.

```markdown
<div align="center">

---

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)** — Powering Africa's Digital Future

*<Project> is <brief context>. For questions, reach out to the GDA engineering team.*

---

</div>
```

**Rules:**
- Always centered with `<div align="center">`
- Always includes the "Built with ❤️ by GDA Africa" line with link
- Always includes the tagline "Powering Africa's Digital Future"
- Second italicized line provides project-specific context
- Wrapped in `---` horizontal rules above and below

---

## 🎨 Visual & Formatting Rules

### Spacing
- **Two blank lines** before every `## h2` section header (GitHub collapses to one, but two in source improves readability)
- **One blank line** after every section header before content
- **Horizontal rule** (`---`) between every major section
- **No trailing whitespace** on any line

### Headers
- `#` (h1) — Used **only once**, in the hero title
- `##` (h2) — Major sections (always with emoji prefix)
- `###` (h3) — Sub-sections within a major section
- `####` (h4) — Rare, only if a sub-section genuinely needs sub-parts

### Emoji Usage
- Every `##` section header **must** start with an emoji
- Use **consistent** emojis (see the required sections table above for the canonical emoji per section)
- Feature lists use emojis as **bullet decorators**
- Do **not** use emoji in `###` or lower headers
- Do **not** use emoji in table cells except the Problem column of the "Why" table

### Tables
- Prefer tables over bullet lists for structured/comparable data
- Always use `|---|---|` separator (no colons for alignment — keep it simple)
- Bold the left column when it serves as a label/category
- Use ✅ and ❌ for boolean/required fields

### Code Blocks
- Always specify the language hint (```bash, ```python, ```json, ```env, etc.)
- Commands must be copy-pasteable — no `<placeholder>` values in the actual README
- Show expected output as `# → comment` on the line after the command
- Multi-step commands: comment each step with `#`

---

## 🏷️ Badge Standards

Use [Shields.io](https://shields.io) badges with the `for-the-badge` style for consistency.

### Badge Format

```markdown
[![Label](https://img.shields.io/badge/Label-Value-COLOR?style=for-the-badge&logo=LOGO&logoColor=white)](LINK)
```

### Required Badges (in order)

| Badge | Purpose |
|---|---|
| **Primary Language** | Python, TypeScript, Go, etc. |
| **Framework** | FastAPI, Next.js, Express, etc. |
| **Secondary Framework*** | If dual-stack (e.g., Flask for WSGI compat) |
| **Database/ORM*** | If the project has persistence |
| **Testing/Quality** | TDD, Jest, Pytest, etc. |
| **License** | Proprietary, MIT, Apache, etc. |

### Color Reference

| Technology | Hex Color |
|---|---|
| Python | `3776AB` |
| TypeScript | `3178C6` |
| JavaScript | `F7DF1E` |
| FastAPI | `009688` |
| Flask | `000000` |
| Next.js | `000000` |
| React | `61DAFB` |
| Node.js | `339933` |
| SQLAlchemy | `D71F00` |
| PostgreSQL | `4169E1` |
| Docker | `2496ED` |
| Pytest / TDD | `green` |
| MIT License | `blue` |

---

## 🧩 Markdown Patterns & Components

### Two-Column Feature Table

```html
<table>
<tr>
<td width="50%">

### Column Title
- ⚡ **Feature** — Description
- 🔒 **Feature** — Description

</td>
<td width="50%">

### Column Title
- 🏗️ **Feature** — Description
- 🗄️ **Feature** — Description

</td>
</tr>
</table>
```

### Problem/Solution Table

```markdown
| Problem | Solution |
|---|---|
| 🔐 Problem | Solution |
| 📧 Problem | Solution |
```

### Environment Variable Table

```markdown
| Variable | Description | Default |
|---|---|---|
| `VAR` | Description | `value` or — |
```

### API Field Table

```markdown
| Field | Type | Required | Description |
|---|---|---|---|
| `field` | `string` | ✅ | Description |
| `field` | `number` | ❌ | Description |
```

### Roadmap Checklist

```markdown
- [x] Completed item
- [ ] Planned item
```

---

## 🗣️ Tone & Voice

| ✅ Do | ❌ Don't |
|---|---|
| Professional but approachable | Overly casual or slangy |
| Confident and direct | Apologetic or hedging ("this might work...") |
| Action-oriented ("Run the server", "Configure your environment") | Passive ("The server can be run...") |
| Concise — one idea per sentence | Verbose paragraphs that bury the point |
| Use "you" to address the reader | Use "we" or "I" (except in the footer) |
| Bold key terms on first use | Bold everything (dilutes emphasis) |
| Celebrate what's built (✅ completed roadmap items) | Apologize for what's missing |

### Writing Principles

1. **Scan-first** — Assume the reader will skim. Tables, bold text, emoji, and headers are your primary communication tools. Paragraphs are secondary.
2. **Copy-paste ready** — Every command, config block, and code example must work when pasted directly. No placeholders in the final README.
3. **Show, don't tell** — Instead of saying "the API is easy to use", show a 5-line cURL example.
4. **Complete on its own** — The README should never require reading another file to get started. Link to other docs for depth, but the README covers the full happy path.

---

## 🚫 Anti-Patterns (What NOT to Do)

| Anti-Pattern | Why It's Bad | Do This Instead |
|---|---|---|
| One-paragraph README | Looks abandoned, provides no structure | Use the full section template |
| No badges | Looks unprofessional, harder to scan | Minimum 3 shields.io badges |
| Placeholder values in commands | Reader can't copy-paste | Use realistic defaults |
| Giant code blocks with no explanation | Reader doesn't know what they're looking at | Add a sentence before every code block |
| Missing API examples | Forces reader to guess the format | Provide cURL + Python + JS examples |
| "TODO" items in the README | Looks unfinished | Use the Roadmap section with checkboxes |
| Wall of text with no formatting | Unreadable, reader bounces | Use tables, headers, lists, and horizontal rules |
| Outdated information | Erodes trust in the project | Update the README with every feature change |
| No architecture diagram | Reader can't understand the system | Use ASCII box diagrams |
| Emoji overload (every word) | Distracting, unprofessional | One emoji per section header, features as bullet prefix |

---

## ✅ Checklist Before Merging

Use this checklist before any PR that modifies the README:

```
[ ] Hero header is centered with title, subtitle, pitch, badges, and tagline
[ ] "About GDA Africa" section connects project to organization mission
[ ] "Why <Project>" has a problem/solution table with 4–6 rows
[ ] Features use a two-column HTML table layout
[ ] Architecture diagram uses ASCII box-drawing characters
[ ] Project structure tree is annotated and up to date
[ ] Quick Start has 4 steps: Clone → Configure → Run → Verify
[ ] API Reference covers every endpoint with schemas and 3+ language examples
[ ] Security section is a table covering auth, encryption, validation, logging
[ ] Testing section shows commands and maps every test file to coverage
[ ] Deployment section includes env var table with defaults
[ ] Roadmap uses checkbox-style list with completed and planned items
[ ] Tech Stack table covers all technologies with versions
[ ] Footer is centered with GDA branding and tagline
[ ] All commands are copy-pasteable (no raw placeholders)
[ ] All code blocks have language hints
[ ] Every ## section has an emoji prefix
[ ] Shields.io badges use `for-the-badge` style
[ ] No spelling or grammar errors
[ ] File renders correctly on GitHub (check preview)
```

---

## 📄 Reference Template

Below is a **copy-paste skeleton** for starting a new GDA project README. Replace all `<bracketed>` values with project-specific content.

````markdown
<div align="center">

# <emoji> <Project Name>

### <Short Subtitle — 3-6 Words>

**<One-sentence pitch mentioning [GDA Africa](https://github.com/GDA-Africa) and core value.>**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-Proprietary-blue?style=for-the-badge)]()

---

*<Tagline — punchy, under 10 words.>*

</div>

---

## 🌍 About GDA Africa

**GDA (Glenhalton Digital Agency)** is building the digital infrastructure for Africa's
next generation of products and services. <Project> is <role> — <what it does>.

---

## 🎯 Why <Project>?

<Framing sentence.>

| Problem | <Project> Solution |
|---|---|
| 🔐 Problem | Solution |
| 📧 Problem | Solution |
| 📉 Problem | Solution |
| 🛠️ Problem | Solution |

---

## ✨ Features

<table>
<tr>
<td width="50%">

### Core Capabilities
- ⚡ **Feature** — Description
- 🔒 **Feature** — Description

</td>
<td width="50%">

### Production Ready
- 🏗️ **Feature** — Description
- 🗄️ **Feature** — Description

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
<ASCII diagram>
```

---

## 📁 Project Structure

```
<annotated file tree>
```

---

## 🚀 Quick Start

### Prerequisites
- **Runtime** (version)

### 1. Clone & Setup
```bash
git clone https://github.com/GDA-Africa/<repo>.git
cd <repo>
```

### 2. Configure Environment
```env
KEY=value
```

### 3. Run
```bash
<run command>
```

### 4. Verify
```bash
<health check>
# → expected output
```

---

## 📡 API Reference

### Base URL
| Environment | URL |
|---|---|
| Production | `https://...` |
| Development | `http://localhost:PORT` |

### `POST /endpoint` — Description

**Request:**
```json
{ "field": "value" }
```

| Field | Type | Required | Description |
|---|---|---|---|
| `field` | `string` | ✅ | Description |

**Responses:**
| Status | Description |
|---|---|
| `200 OK` | Success |

---

## 🔐 Security

| Layer | Implementation |
|---|---|
| **Auth** | Details |
| **Encryption** | Details |

---

## 🧪 Testing

```bash
pytest
pytest --cov=.
```

| Suite | Covers |
|---|---|
| `test_file.py` | What it tests |

---

## 🚢 Deployment

```bash
./deploy.sh
```

| Variable | Description | Default |
|---|---|---|
| `VAR` | Description | `value` |

---

## 🗺️ Roadmap

- [x] Completed
- [ ] Planned

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Runtime** | Language + version |

---

<div align="center">

---

**Built with ❤️ by [GDA Africa](https://github.com/GDA-Africa)** — Powering Africa's Digital Future

*<Project context line.>*

---

</div>
````

---

<div align="center">

---

**GDA README Standards v1.0** — Maintained by the GDA Engineering Team

*Every repo is a first impression. Make it count.*

---

</div>
