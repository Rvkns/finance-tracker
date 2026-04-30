export interface Transaction {
    id: string;
    user_id: string;
    household_id: string;
    amount: number;
    category_id: string;
    description: string | null;
    date: string;
    created_at: string;
    profiles?: { full_name: string | null };
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    rule: 'needs' | 'wants';
}

export interface Profile {
    id: string;
    household_id: string | null;
    full_name: string | null;
    email: string;
    salary: number;
}

export interface Household {
    id: string;
    invite_code: string;
    name: string;
    split_mode: 'equal' | 'proportional';
}

export interface Budget {
    id: string;
    household_id: string;
    category_id: string;
    amount: number;
}

export interface RecurringExpense {
    id: string;
    household_id: string;
    category_id: string;
    name: string;
    amount: number;
    created_at?: string;
    updated_at?: string;
}

export interface StructuralExpense {
    id: string;
    household_id: string;
    name: string;
    amount: number;
    paid_by: string | null; // null = conto cointestato (split 50/50), altrimenti user_id di chi paga tutto
    created_at?: string;
    updated_at?: string;
}
