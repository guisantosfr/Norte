import { HttpErrorResponse } from '@angular/common/http';

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: string | number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: ApiFieldError[];
}

export interface ParsedApiError {
  httpStatus: number;
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
}

export function parseHttpError(err: unknown): ParsedApiError {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiErrorResponse> | null;
    const fieldErrors: Record<string, string> = {};

    if (body && Array.isArray(body.fieldErrors)) {
      for (const fe of body.fieldErrors) {
        if (fe?.field && fe?.message && !fieldErrors[fe.field]) {
          fieldErrors[fe.field] = fe.message;
        }
      }
    }

    if (err.status === 0) {
      return {
        httpStatus: 0,
        code: 'NETWORK_ERROR',
        message:
          'Não foi possível conectar ao servidor. Verifique se a API do Norte está em execução.',
        fieldErrors,
      };
    }

    return {
      httpStatus: err.status,
      code: body?.error ?? 'HTTP_ERROR',
      message:
        body?.message ??
        'Ocorreu um erro ao processar sua solicitação. Tente novamente.',
      fieldErrors,
    };
  }

  return {
    httpStatus: 500,
    code: 'UNKNOWN_ERROR',
    message: 'Ocorreu um erro inesperado.',
    fieldErrors: {},
  };
}
