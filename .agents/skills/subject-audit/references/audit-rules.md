# Subject Binding Audit Rules

## Audit scope

Use the caller's start and end timestamps as the scan interval and display it in `Asia/Shanghai` in
the report. Review every returned animation resource, including both null and non-null `subjectId`
values, against the complete registered Subject index.

## Working evidence

The audit starts with two base evidence files and creates additional task-scoped files as needed:

- `resources.jsonl` is produced by `fetch-resources.mjs`. Its header contains the interval and counts;
  each remaining line contains `provider`, `providerId`, `subjectId`, `title`, and `createdAt`.
- `subjects.jsonl` is produced by `fetch-subjects.mjs`. Its header contains the Subject count; each
  remaining line contains `id`, `title`, `aliases`, `search`, and `onairDate`.
- `subject-relations.jsonl` is produced when related installments would clarify the candidate set.
  `fetch-subject-relations.mjs` accepts selected candidate IDs, and each record contains the source
  Subject and its direct `前传` and `续集` Subjects, including IDs, titles, and air dates.
- `targets.jsonl` is prepared after attribution when at least one resource has a reliable target.
  Each line identifies a resource by `provider` and `providerId` and supplies its
  `targetSubjectId`.
- `matches.jsonl` is produced from a non-empty target list by `check-subject-matches.mjs`. It records
  the production-normalized title, target Subject search, effective target match, concrete match
  diagnostics, binding comparison, and outcome.

The optional online correction produces a preview JSONL and, after confirmation, a separate result
JSONL containing the admin acknowledgements. The admin secret remains in the environment and is not
written to either file.

The complete Subject evidence provides the current registry and search configuration. Use
`onairDate` as content context when comparing installments. The audit explains the binding and
search state now and recommends improvements to that state.

Use a fresh `--output` path for each generated file. Confirm that each generated JSONL contains its
header plus the declared number of records. Read large files in line ranges and track the completed
resource ranges so every resource is reviewed. Keep the evidence available until the report has
been checked.

## Attribution judgment

### Interpret the release

Treat a resource title as a release description rather than a normalized work identifier. Translate
or expand names when useful, and account for subgroup conventions, abbreviations, batch labels,
specials, episode ranges, and inconsistent season notation. Neighboring releases often clarify terse
or reused titles.

### Compare plausible Subjects

Build a small candidate set from the registry and decide which Subject best explains the complete
release context. Evidence can include:

- canonical names, aliases, translations, abbreviations, and distinctive subtitles;
- season, sequel, cour, part, arc, edition, movie, OVA, or special context;
- episode numbering, including resets, continuous numbering, batches, and specials;
- `createdAt` relative to the candidates' air dates and release progression;
- sibling Subjects and adjacent installments with similar names;
- consistency with related releases from the same publisher or title family.

Use the signals that carry information in the case at hand. An explicit installment subtitle may be
decisive in one family, while episode progression and publication timing may matter more when several
quarters reuse the same title. A missing season marker can be normal for a publisher, and an air date
usually supports rather than proves an attribution. Confidence comes from a coherent explanation
with no material contradiction, not from matching a fixed number of strings or signals.

For long-running or multi-part families, fetch relations for the plausible candidates. Relation
evidence expresses quarter and part continuity through directional `前传` and `续集` labels: a related
Subject marked `续集` follows the source record, while `前传` precedes it. Follow additional direct
links when the relevant installment chain spans more than one edge. Use the resulting chain to
organize the candidates, then distinguish the installment through titles, episode progression,
publication timing, and neighboring releases.

Attribution is reliable when one registered Subject is clearly better supported than the plausible
alternatives. When multiple Subjects remain materially plausible, retain the uncertainty and explain
which evidence would distinguish them.

### Classify the binding state

For a resource with a current Subject ID:

- **Correctly bound:** the current Subject coherently fits the work and installment.
- **Wrongly bound:** another registered Subject is clearly better supported; retain both IDs.
- **Suspicious:** meaningful evidence conflicts with the current Subject, but the replacement remains
  uncertain.
- **Missing current Subject:** the current ID is absent from the registry; continue attribution from
  the release evidence and record the missing ID.

For an unbound resource:

- **Attributable:** one registered Subject is reliably supported.
- **Uncertain:** multiple registered Subjects remain plausible.
- **Unregistered:** the identifiable work or installment has no registered Subject.

Clearly non-animation or unusable records can be counted separately with a brief explanation.

## Effective search verification

Create target records for every reliably attributed resource, then run `check-subject-matches.mjs`
when the list is non-empty. The helper uses the production `normalizeTitle` and
`matchesSubjectSearch` implementations; `targetMatches` therefore describes the effective search
result for the selected target Subject.

Interpret the result together with the current binding:

| Target result          | Current binding         | Diagnosis                                                               |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `targetMatches: false` | Any                     | The target Subject has a search-filter gap for this release             |
| `targetMatches: true`  | Null or another Subject | The target currently has coverage; record the binding-state discrepancy |
| `targetMatches: true`  | Target Subject          | Current coverage and binding agree for this release                     |

This verification follows semantic attribution. Attribution confidence comes from the release
evidence; the helper supplies the chosen Subject's current production search behavior. A true result
shows current coverage for that resource. Review the surrounding release family separately to judge
attribution and selectivity.

`matchDiagnostics` explains the current result with the normalized values actually evaluated:

- `failedConditions` summarizes the failed categories: `include-miss`, `include-near-miss`,
  `missing-keywords`, `matched-exclude`, `after-boundary`, or `before-boundary`;
- `matchedIncludes` shows the include alternatives that matched exactly;
- `includeNearMisses` shows include alternatives found only after removing spaces, punctuation, and
  symbol separators from both sides;
- `missingKeywords` and `matchedExcludes` list the exact normalized conditions responsible;
- `timeViolations` identifies the boundary, its ISO representation, and the distance outside it.

An `include-near-miss` is a focused review clue for formatting differences and leaves
`targetMatches` unchanged. Compare the original title, normalized title, and neighboring release
forms before deciding whether the search condition should accommodate the variation.

## Search diagnosis

The supported search fields are:

- `include`: alternative title substrings, any one of which can establish the base title match;
- `keywords`: additional substrings required together;
- `exclude`: substrings that reject collisions;
- `after`: inclusive lower bound on resource `createdAt`, as Unix epoch milliseconds;
- `before`: inclusive upper bound on resource `createdAt`, as Unix epoch milliseconds.

Assess two qualities independently:

- **Coverage:** whether the intended release forms match the target Subject.
- **Selectivity:** whether the same conditions also admit unrelated works or neighboring
  installments.

For a target miss, begin with its concrete diagnostics, then compare the example with related
releases before proposing a change. A separator-insensitive near miss often points to spacing,
punctuation, or release-group delimiter variation, but the safe remedy still depends on the title
family. For a wrong binding, assess the current search settings on both sides: the target may lack
coverage, one Subject may be too broad, or overlapping searches may need coordinated changes. These
observations describe the current configuration.

A successful target match settles coverage for that example, not selectivity. When the surrounding
release family also supports the rule's precision, state that the target search needs no adjustment.
For short or broadly reused terms, examine actual unrelated matches and neighboring Subjects. The
evidence may support a longer phrase, an additional keyword, or a focused exclusion; the term length
alone does not determine whether the rule is adequate.

Prefer conditions that explain a recurring release family and separate neighboring Subjects without
depending on incidental formatting. Depending on the evidence, an appropriate change can be an
alternative phrase, a title plus a distinguishing keyword, a focused exclusion, a time range, or a
combination. Preserve real title variation, and state when an isolated or noisy example does not
support a safe search change.

### Time boundaries

`after` and `before` are useful when separately registered installments reuse the same practical
release title and title terms alone cannot safely separate them. Base a proposed boundary on the
resource publication streams being separated.

Derive a boundary from the observed handoff between release streams. Resource `createdAt` is the
matched value; Subject air dates, episode progression, and neighboring releases provide context.
Account for late reissues, batches, and delayed subgroup releases when deciding whether the handoff
is reliable.

Coordinate the earlier Subject's `before` and the later Subject's `after` so the ranges do not
overlap. Both bounds are inclusive, so the same millisecond on both sides would match both Subjects.
Report each proposed boundary in ISO time and Unix epoch milliseconds with the applicable Subject and
field.

## Optional online binding correction

This branch applies reliably established target Subject IDs directly to current online resources. It
can include both search-filter gaps and binding-state anomalies when the evidence current Subject ID
differs from the target.

First run `patch-resource-bindings.mjs` without `--apply`. The preview contains only records whose
current Subject ID differs from the target. Present those resource keys, current IDs, target IDs, and
the exact planned count for user confirmation.

After confirmation, pass that preview file back to the script with
`--apply --expected-count <confirmed count>` and a fresh result path. Apply mode reads `ADMIN_SECRET`
from the project root `.env`, validates the confirmed patch set, and writes a result journal with
server acknowledgements, failures, and any server state that differs from the audit snapshot. The
default manager URL targets the production service; `--url` can select another environment. This
operation updates resource bindings only, so the Subject search assessment remains a separate
finding. A failed apply can leave a partial journal; report failed and unattempted resources. Later
resource synchronization may recalculate bindings, so the search recommendations remain relevant.

## Report format

The summary combines resource binding states with search diagnoses. Treat them as related but
separate dimensions and calculate each row independently.

| 项目                              |                数量 |
| --------------------------------- | ------------------: |
| 动画资源                          |              资源数 |
| 已有 Subject ID                   |        资源数和占比 |
| 未绑定                            |              资源数 |
| 已验证绑定正确                    |              资源数 |
| 错误绑定                          |              资源数 |
| 可疑绑定或当前 Subject 不在注册表 |              资源数 |
| 未绑定但可可靠归属                |              资源数 |
| 不确定、未注册或另行排除          |              资源数 |
| 搜索过滤缺口                      | 资源数和 Subject 数 |
| 绑定状态异常                      |              资源数 |

Correctly bound resources contribute to the summary. List confirmed issues in the table matching
their binding state. A missing current Subject with a reliable replacement can use the incorrect
binding table and show the current anime as `注册表中不存在`; unresolved replacements belong with
suspicious bindings. When a confirmed search gap does not fit the three common categories below,
add a focused search-gap table using the same evidence and linking conventions.

### 未绑定但可可靠归属

| 正确 Subject ID | 动画 | 示例资源 | 归属依据 | 搜索条件评估 | 建议调整 |
| --------------: | ---- | -------- | -------- | ------------ | -------- |

### 错误绑定

| 当前 Subject ID | 当前动画 | 正确 Subject ID | 正确动画 | 示例资源 | 归属依据 | 搜索条件评估 | 建议调整 |
| --------------: | -------- | --------------: | -------- | -------- | -------- | ------------ | -------- |

### 可疑绑定

| 当前 Subject ID | 当前动画 | 候选 Subjects | 示例资源 | 冲突证据 | 尚待确认的信息 |
| --------------: | -------- | ------------- | -------- | -------- | -------------- |

For each reliable attribution, link the anime name to `https://bgm.tv/subject/{id}` and show the
numeric correct Subject ID. Link the complete resource title to
`https://animes.garden/detail/{provider}/{providerId}` and show `provider/providerId`. Explain the
attribution before the search diagnosis, and name the affected Subject and search field in each
suggestion. Frame the explanation around the current binding discrepancy and current search
improvement.

Group examples when they share the same attribution and search diagnosis. Present recommendations as
unranked changes to current title patterns and Subject search fields. Describe changes from a
previous round when a supplied evidence snapshot supports the comparison.

When online bindings were applied, add the result counts and link each incomplete resource using the
same resource-link convention.
