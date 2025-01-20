export interface ScrapedResource {
  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: string;

  size: string;

  publisher?: {
    id: string;

    name: string;

    avatar?: string;
  };

  fansub?: {
    id: string;

    name: string;

    avatar?: string;
  };

  /**
   * Date.toISOString()
   */
  createdAt: string;
}

export interface ScrapedResourceDetail extends Omit<ScrapedResource, 'magnet' | 'tracker'> {
  description: string;

  files: Array<{
    name: string;

    size: string;
  }>;

  magnets: Array<{
    name: string;

    url: string;
  }>;

  hasMoreFiles: boolean;
}
