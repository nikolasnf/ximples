export interface TokenBalance {
  balance: number;
}

export interface TokenTransaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  source: 'signup_bonus' | 'purchase' | 'usage' | 'adjustment';
  description: string | null;
  created_at: string;
}

export interface TokenPackage {
  id: number;
  name: string;
  slug: string;
  tokens: number;
  price: number;
  currency: string;
}

export interface TokenEstimate {
  intent: string;
  estimated_token_cost: number;
  actions: { type: string; cost: number }[];
  enough_balance: boolean;
  current_balance: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
