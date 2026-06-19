export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalCount?: number;
  };
}
