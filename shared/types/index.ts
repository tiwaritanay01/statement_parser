export * from './pagination.js';

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionDTO {
  id: string;
  tenantId: string;
  date: Date;
  description: string;
  amount: number;
  balance?: number | null;
  confidence: number;
  currency: string;
  category?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsingRuleDTO {
  id: string;
  tenantId: string;
  name: string;
  regexPattern: string;
  targetCategory: string;
  createdAt: Date;
  updatedAt: Date;
}
