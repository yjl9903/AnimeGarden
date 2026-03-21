export class SystemError extends Error {}

export class ResourcesSlowQueryBusyError extends Error {
  public constructor() {
    super('Resources slow database query is busy. Please retry later.');
    this.name = ResourcesSlowQueryBusyError.name;
  }
}

export class ResourcesSlowQueryTimeoutError extends Error {
  public constructor() {
    super('Resources query exceeded both normal and extended database timeouts.');
    this.name = ResourcesSlowQueryTimeoutError.name;
  }
}
