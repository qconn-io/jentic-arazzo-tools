# Focused design review, 2026-10-12

Status: DONE_WITH_CONCERNS. This is an agent-led browser/design review, not an unfamiliar-reader session or explicit user-confirmed reader feedback. Task 4.3 and final UX acceptance remain pending.

## Scope and evidence

Reviewed API availability discovery, failed-source recovery, and Loaded / Operation found / validation distinctions on candidate `2fce262`. Used gstack Chromium with reused production assets at 1440×1000, 768×1024, and 480×900. Asset and input hashes are in `design-review-identity.json`. No fresh rebuild or independent source-to-build verification was performed. The UI unit suite passed 661 tests immediately before the candidate commit; that is separate engineering evidence.

`http://127.0.0.1:3000/review.html` serves the existing digital-product example through a temporary local wrapper. The review server returns one payment-description HTTP 503, then succeeds. `/missing.html` uses a temporary derived document and supported coordinator description with `purchaseProduct` renamed, allowing loaded-but-missing lookup. Original repository YAML was not edited. The server fixture is preserved in `design-review-server.py.txt`. These are local description requests, not API-service execution.

## First impression and system

Mode: OPERATE, with workflow reading as secondary context. I notice a calm, dense workspace: my eye goes to workflow selection, reading controls, then the API descriptions count. The summary is above the workflow and has a visible disclosure arrow. Opening it preserves the reading surface below. In one word: inspectable.

The rendered API summary and inspector use the existing system sans stack, 14px text, slate neutrals and blue links. Sources have simple separators, not decorative cards. No new design system is proposed. Workflow navigation, source context and search are identifiable; the trunk test is PASS for these views. The nested source scroll area is the least obvious area boundary.

## Observed flows

| Goal | Actual browser observation | Evidence |
| --- | --- | --- |
| Locate availability without selecting a step | Untouched entry says `API descriptions · 3 of 4 loaded · 1 failed`. One disclosure click exposes all four source entries and actions. The same summary remains present in All workflows at 480px. | `design-review-captures/entry-desktop.png`, `sources-desktop.png`, `overview-mobile.png` |
| Recover a failed source | Opened the summary and clicked `Retry API description payment`. Payment became Loaded; count became 4 of 4. Focus remained on the payment source section. No step was selected for recovery. This scripted path does not establish unaided human discovery. | `entry-desktop.png`, `retry-desktop.png` |
| Distinguish loading from lookup | Normal purchase inspection says Operation found and explains that this means located in the source, not full validity or execution. In the derived fixture, coordinator remains Loaded while purchase says Operation not found in both widths. | `operation-desktop.png`, `missing-operation-desktop.png`, `missing-operation-mobile.png` |
| Find validation scope | Below the four sources, the summary states loading does not establish contract validity. Opening Inspection scope exposes the explicit schema-validation/execution disclaimer. | `scope-tablet.png`; rendered text probe |

No page-wide overflow was observed in the inspected 480px and 768px states. The only recorded console error was the deliberately injected HTTP 503. No measured reader times, reader quotes, reader assistance scores, or goodwill measurements were collected.

## Findings

### FINDING-001: Recovery controls are too small and styled differently by context

Medium, interaction/responsive. Source-list Reload controls measured 19px high; the identical coordinator action measured 35px in Contract & Source. Both are below the skill's 44px touch criterion. I notice browser-default buttons in the document-level source list, while the inspector uses padded viewer buttons. This makes the primary recovery surface less comfortable on a phone.

Expected: shared source actions have consistent viewer styling and touch-sized targets. Smallest suggested fix: apply the existing viewer button styling at the shared source-control level, with a 44px minimum target. Evidence: `sources-mobile.png` and `missing-operation-mobile.png`. Independent source audit corroborates the context-dependent styling at `src/styles/index.css:1049` and `:1339`. Fix status: deferred; this request is a review and evidence record.

### FINDING-002: Status explanations are below the source scroll area

Medium, content/hierarchy. The expanded region measured 315px high with 731px of content at 480px. Initial opening shows only the first sources; the loading/validity explanation and Inspection scope require scrolling through the list. I wonder whether an unfamiliar reader will stop at the prominent Loaded count and miss the limits. That is a reader-validation question, not an observed misunderstanding.

Expected: the scope of Loaded is visible when availability is first opened. Smallest suggested fix: place one compact `Loaded = description available; not validated` explanation before the source list, retaining detailed scope below. Evidence: `sources-desktop.png`, `sources-mobile.png`, `scope-tablet.png`. Fix status: deferred pending reader feedback.

### FINDING-003: Source result updates have no live announcement region

Medium, accessibility. Rendered API-description content has no `role="status"` or `aria-live` region. Independent static review found ordinary status/error paragraphs in `src/components/SourceDescriptions.tsx:55` and `:85`, unlike the operation result's status region. Focus retention succeeded, but it does not establish that assistive technology announces a completed retry.

Expected: a focused source's changed loading/failure/result status is announced politely. Smallest suggested fix: a compact source-result live region, avoiding announcements of entire raw descriptions. Evidence of the visible changing result: `retry-desktop.png`; DOM probe confirms zero live regions. Fix status: deferred. Actual screen-reader behavior was not tested.

## Quick wins and assessment

1. Reuse viewer styling for shared source actions and reach 44px targets.
2. Put the Loaded/validation distinction before the scrolling source list.
3. Announce source-result changes through a concise polite status region.

Focused assessment: Design B; AI Slop A within these surfaces. Interaction C (two medium findings); responsive A/B (one medium target issue); content A/B and hierarchy A/B (one medium explanation-placement issue). Other checklist categories were not exhaustively graded. These are provisional focused grades, not a full-site weighted score. No score delta is claimed because no fixes were made. Detector skipped by user; Claude Code outside voice unavailable (`claude` was not installed); in-host independent source review completed.

Heuristic goodwill: starts 70, +10 visible availability, +10 source-specific recovery, -5 hidden scope explanation = 85/100. This is reviewer judgment, not participant research.

Summary: three medium findings, zero application fixes, three deferred. No hard-rejection pattern observed on the scoped source surfaces. No illustrative service endpoints, execution, full schema validation, assistive-technology session, or unfamiliar-reader comprehension tested. No durable learning beyond the already documented evidence boundary was identified.

PR summary: Focused design review verified discovery and retry operability and recorded three design/accessibility concerns; reader acceptance remains pending.
