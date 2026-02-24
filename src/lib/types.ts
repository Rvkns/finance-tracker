export interface Transaction {
    id: string;
    user_id: string;
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
}

export interface Profile {
    id: string;
    full_name: string | null;
    email: string;
}
