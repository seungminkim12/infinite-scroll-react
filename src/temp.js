export type ErrorType = "API" | "Module" | "External" | "unknown";

export type ActionErrorType = { type: ErrorType; data: any } | undefined;

export type ActionType<T> = {
  result: T | undefined;
  error: undefined | any;
};

export const actionController = async <T>(
  fn: () => Promise<T>
): Promise<ActionType<T>> => {
  try {
    const result = await fn();
    return { result, error: undefined };
  } catch (e: unknown) {
    let actionError: ActionErrorType;
    actionError = {
      type: "unknown",
      data: e,
    };
    return {
      result: undefined,
      error: e,
    };
  }
};
