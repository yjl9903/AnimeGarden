export interface SerializedError {
  name: string;
  message: string;
}

export function serializeError(error: unknown): SerializedError | undefined {
  if (!error) return undefined;

  if (error instanceof globalThis.Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error
    };
  }

  try {
    return {
      name: typeof error,
      message: JSON.stringify(error)
    };
  } catch {
    return {
      name: typeof error,
      message: String(error)
    };
  }
}

export function getTrackingError(error: SerializedError | undefined, fallback: string) {
  if (!error) return fallback;

  if (error.name && error.message && error.name !== error.message) {
    return `${error.name}: ${error.message}`;
  }

  return error.message || error.name || fallback;
}
