/**
 * Parser for the `animegarden_search_resources` tool result.
 *
 * The Host renders one Markdown table per successful search (see
 * `host/resources/render.ts`), but the Harness Markdown renderer keeps only
 * `http:`/`https:`/`mailto:` anchors, so the table's magnet links arrive as plain
 * text. The chat card parses that table back into rows and renders each action
 * with the plugin's own anchors. The parse is defensive: any shape mismatch
 * yields no rows and the card falls back to the raw text instead of hiding the
 * result.
 */

/** One resource parsed from one table row. */
export interface ToolViewResource {
  title: string;
  /** `provider:providerId` source identity printed by the Host renderer. */
  source: string;
  /** Resource type label. */
  type: string;
  /** `fansub / publisher` line printed by the Host renderer. */
  credits: string;
  /** Human-readable size, with the byte count in the same cell. */
  size: string;
  /** Publish time as rendered by the Host (ISO 8601). */
  published: string;
  /** Anime Garden detail page. */
  detailUrl: string;
  /** KeepShare playback page. */
  keepshareUrl: string;
  /** BitTorrent magnet URI. */
  magnet: string;
}

/** Column count of the rendered table: title through magnet. */
const TABLE_COLUMNS = 10;

/** Markdown link cell: label and target without nested parentheses. */
const LINK_CELL = /^\[[^\]]*\]\(([^)]*)\)$/u;

/**
 * Split one table line into cells, honoring escaped pipes from the renderer's
 * `escapeCell`.
 * @param line - trimmed Markdown table line.
 * @returns the cell texts without the outer pipes.
 */
function splitCells(line: string): string[] {
  const inner = line.startsWith('|') ? line.slice(1) : line;
  const content = inner.endsWith('|') ? inner.slice(0, -1) : inner;
  const cells: string[] = [];
  let cell = '';

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '\\' && content[index + 1] === '|') {
      cell += '|';
      index += 1;
      continue;
    }
    if (char === '|') {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

/**
 * Read a Markdown link cell's target.
 * @param cell - one table cell.
 * @returns the link target, or an empty string for `—`/plain text.
 */
function linkTarget(cell: string): string {
  const match = LINK_CELL.exec(cell);
  return match?.[1]?.trim() ?? '';
}

/**
 * Parse the Host tool's Markdown table into renderable resource rows.
 *
 * @param markdown - the tool result text.
 * @returns one entry per valid table row; empty when the text is not the expected table.
 */
export function parseResourceTable(markdown: string): ToolViewResource[] {
  const table: string[][] = [];
  for (const line of markdown.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) table.push(splitCells(trimmed));
  }

  // Header, separator, then at least one resource row.
  if (table.length < 3) return [];
  const header = table[0];
  if (header === undefined || header.length !== TABLE_COLUMNS) return [];

  const resources: ToolViewResource[] = [];
  // Skip the header and the `| --- |` separator row.
  for (const row of table.slice(2)) {
    if (row.length !== TABLE_COLUMNS) continue;
    const [title, source, type, credits, size, published, , detailUrl, play, download] = row;
    if (title === undefined || source === undefined || title === '' || title === '—') continue;
    resources.push({
      title,
      source,
      type: type ?? '',
      credits: credits ?? '',
      size: size ?? '',
      published: published ?? '',
      detailUrl: linkTarget(detailUrl ?? ''),
      keepshareUrl: linkTarget(play ?? ''),
      magnet: linkTarget(download ?? '')
    });
  }
  return resources;
}

/** Filter line the Host renders above the table. */
const FILTER_LINE = /^筛选参数：(.*)$/u;

/** One `` `key=<JSON>` `` fragment inside the filter line. */
const FILTER_PART = /`([A-Za-z]+)=([^`]+)`/gu;

/** One applied filter group parsed from the result text. */
export type AppliedFilter = Record<string, unknown>;

/**
 * Parse the Host's `筛选参数` line into the filter groups the server applied.
 *
 * The Host renders the resolved filter as `` `key=JSON` `` fragments (or `无`),
 * so the card can describe the search without calling the API again.
 *
 * @param markdown - the tool result text.
 * @returns the applied filter groups; empty when the line is absent or `无`.
 */
export function parseAppliedFilter(markdown: string): AppliedFilter {
  const filter: AppliedFilter = {};
  for (const line of markdown.split(/\r?\n/u)) {
    const match = FILTER_LINE.exec(line.trim());
    if (match === null) continue;
    const body = match[1]?.trim() ?? '';
    if (body === '' || body === '无') return filter;
    for (const part of body.matchAll(FILTER_PART)) {
      const key = part[1];
      const raw = part[2];
      if (key === undefined || raw === undefined) continue;
      try {
        filter[key] = JSON.parse(raw);
      } catch {
        filter[key] = raw;
      }
    }
    break;
  }
  return filter;
}
