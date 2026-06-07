import type { AckResponse, GameErrorCode } from "../../../shared/types/network";

export function ok<T>(data: T): AckResponse<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: GameErrorCode, message: string): AckResponse<T> {
  return { ok: false, error: { code, message } };
}
