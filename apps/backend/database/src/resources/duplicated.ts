export class DuplicatedManager {
  private readonly titleMap = new Map<string, number>();

  private readonly magnetMap = new Map<string, number>();

  public insert(resource: {
    id: number;
    title: string;
    magnet: string;
    isDeleted?: boolean | null;
    duplicatedId?: number | null;
  }) {
    if (resource.isDeleted) return;
    if (resource.duplicatedId !== undefined || resource.duplicatedId !== null) return;

    const { id, title, magnet } = resource;
    if (!this.titleMap.has(title)) {
      this.titleMap.set(title, id);
    }
    if (!this.magnetMap.has(magnet)) {
      this.magnetMap.set(magnet, id);
    }
  }

  public find(title: string, magnet: string) {
    const id1 = this.titleMap.get(title);
    const id2 = this.magnetMap.get(magnet);
    if (id1 !== undefined && id2 !== undefined) {
      return Math.min(id1, id2);
    } else if (id1 !== undefined) {
      return id1;
    } else if (id2 !== undefined) {
      return id2;
    } else {
      return null;
    }
  }
}
