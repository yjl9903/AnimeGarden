---
name: subject-audit
description: Review AnimeGarden animation resource-to-Bangumi Subject bindings for a specified time range, identify missing or incorrect bindings, and report evidence-backed Subject search improvements. Use for manager-side audits; online binding corrections are optional and require explicit user confirmation.
---

# AnimeGarden Subject Audit

Review every animation resource in a requested time range, determine which registered Bangumi
Subject it most likely belongs to, and assess both its current binding and the target Subject's search
coverage. The current `subjectId` and search configuration are evidence about system state rather
than the basis for attribution.

The standard path produces a read-only audit report. An optional confirmed step can apply reliable
target Subject IDs to current online resources before the report is finalized.

Read [references/audit-rules.md](references/audit-rules.md) for the attribution standard, search
diagnosis, and report format.

## Workflow

### 1. Collect the audit evidence

Create a fresh task-scoped temporary directory and run from this skill directory:

```bash
node scripts/fetch-resources.mjs --start <ISO timestamp> --end <ISO timestamp> --output <tmp-dir>/resources.jsonl
node scripts/fetch-subjects.mjs --output <tmp-dir>/subjects.jsonl
```

The first file contains all animation resources in the interval and their current `subjectId`; the
second contains the complete registered Subject index. Confirm the declared counts, then review the
resource file in manageable batches until every record has been assessed.

### 2. Attribute every resource

Identify the work, installment, and episode from the complete release context. For an existing
binding, evaluate the bound Subject alongside other plausible registered Subjects. For an unbound
resource, search the registry using the title forms suggested by the release.

Weigh the evidence that is informative for that resource: names and aliases, season or part context,
episode progression, publication timing, related Subjects, and neighboring releases. Their relevance
varies by title family, so attribution follows the explanation that best fits the whole release
context. Record uncertainty when the evidence does not support one clear Subject.

When several registered installments share a practical title or continue episode numbering, fetch
the direct predecessor and sequel relations for the plausible candidates:

```bash
node scripts/fetch-subject-relations.mjs --subject-ids <id[,id...]> --output <tmp-dir>/subject-relations.jsonl
```

Use this optional evidence to navigate quarter and part boundaries in long-running families such as
`ONE PIECE` and `BLEACH`. Relations narrow the candidate set; the resource title, episode sequence,
and publication context still determine the attribution.

### 3. Check the target Subject's effective match

For every resource with a reliably established target, write one record per line to
`<tmp-dir>/targets.jsonl`:

```json
{ "provider": "mikan", "providerId": "123", "targetSubjectId": 456 }
```

When the target list is non-empty, run the production-equivalent match check:

```bash
node scripts/check-subject-matches.mjs --resources <tmp-dir>/resources.jsonl --subjects <tmp-dir>/subjects.jsonl --targets <tmp-dir>/targets.jsonl --output <tmp-dir>/matches.jsonl
```

The result answers whether the selected target Subject matches each resource under the current
production title normalization and search semantics. It also identifies the exact failed condition:
an include miss or formatting-only near miss, missing keywords, matched excludes, and violated time
boundaries. Combine those diagnostics with the current `subjectId` to describe the present search
coverage and binding state. This check measures the current search configuration; the release
evidence from step 2 remains the basis for attribution.

### 4. Diagnose Subject search coverage

Inspect both coverage and selectivity in the target Subject's current search settings and, for a
wrong existing binding, the currently bound Subject as well. A successful match confirms coverage
but can still be too broad; short or common terms need supporting context from actual release
families. Recommend the focused `include`, `keywords`, `exclude`, `after`, or `before` changes that
best separate the current Subjects. Time signals may complement titles when resource publication
ranges provide a reliable present-day boundary.

Treat `include-near-miss` as an inspection hint: the include becomes a substring after ignoring
spaces, punctuation, and symbol separators. The production result remains unchanged, and the safe
search adjustment depends on the complete release family.

### 5. Optionally apply confirmed resource bindings

If the user asks to apply reliable target bindings before the Subject search configuration is
updated, generate a preview:

```bash
node scripts/patch-resource-bindings.mjs --input <tmp-dir>/matches.jsonl --output <tmp-dir>/binding-patch-preview.jsonl
```

Present the exact resource count and current-to-target Subject mappings from the preview. After the
user explicitly confirms that patch set, apply that preview file with the confirmed count:

```bash
node scripts/patch-resource-bindings.mjs --input <tmp-dir>/binding-patch-preview.jsonl --output <tmp-dir>/binding-patch-results.jsonl --apply --expected-count <confirmed count>
```

Apply mode reads `ADMIN_SECRET` from the project root `.env` and records server results in a journal.
Keep the audit read-only until the user confirms the exact previewed patch set.

### 6. Report the findings

Write the report in Chinese using the tables defined in the reference. Include the scan interval,
summary counts, linked resource examples, and the correct numeric Subject ID with its Bangumi link
whenever attribution is reliable. Show both current and correct Subjects for a wrong binding, and
state the remaining ambiguity for unresolved cases.

When the optional online patch ran, include its changed, unchanged, and failed counts and identify
any resource that was not completed.

Present Subject search recommendations as an unranked list and keep them focused on current title
patterns and Subject search fields.

Compare with an earlier round when an actual prior evidence snapshot is available.
