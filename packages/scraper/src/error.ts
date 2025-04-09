export class NetworkError extends Error {
  public constructor(
    public readonly name: string,
    public readonly url: string,
    public readonly response: Response
  ) {
    super(`Failed connecting to ${url}`, { cause: response });
  }
}
