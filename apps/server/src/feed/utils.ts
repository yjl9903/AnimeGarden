import { toDate } from 'date-fns-tz';

/** Map a byte-based resource into an RSS item using an explicit site hostname. */
export function convertResourceToRssItem(
  resource: {
    provider: string;
    providerId: string;
    title: string;
    createdAt: string | Date;
    subjectId?: number | null;
    magnet: string;
    tracker: string;
    size: number;
  },
  tracker: boolean,
  site: string
) {
  return {
    title: resource.title,
    pubDate: toDate(resource.createdAt, { timeZone: 'Asia/Shanghai' }),
    link: `https://${site}/detail/${resource.provider}/${resource.providerId}`,
    extensions: { 'animegarden:subjectId': resource.subjectId },
    enclosure: {
      url: resource.magnet + (tracker ? resource.tracker : ''),
      length: resource.size,
      type: 'application/x-bittorrent'
    }
  };
}
