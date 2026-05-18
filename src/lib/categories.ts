export const CATEGORIES = [
    { id: 'clothing', name: 'Abbigliamento', icon: '👕', color: '#06b6d4', rule: 'wants' },
    { id: 'subscriptions', name: 'Abbonamenti', icon: '📱', color: '#14b8a6', rule: 'wants' },
    { id: 'bills', name: 'Bollette (Generiche)', icon: '⚡', color: '#ef4444', rule: 'needs' },
    { id: 'water', name: 'Acqua', icon: '💧', color: '#0284c7', rule: 'needs' },
    { id: 'electricity', name: 'Luce', icon: '⚡', color: '#eab308', rule: 'needs' },
    { id: 'gas', name: 'Gas', icon: '🔥', color: '#f97316', rule: 'needs' },
    { id: 'trash', name: 'Mondezza (TARI)', icon: '🗑️', color: '#78716c', rule: 'needs' },
    { id: 'internet', name: 'Internet', icon: '🌐', color: '#2563eb', rule: 'needs' },
    { id: 'house', name: 'Casa', icon: '🏠', color: '#3b82f6', rule: 'needs' },
    { id: 'health', name: 'Farmacia/Salute', icon: '💊', color: '#ec4899', rule: 'needs' },
    { id: 'maui_health', name: 'Farmaci Maui', icon: '🩺', color: '#d946ef', rule: 'needs' },
    { id: 'maui', name: 'Maui', icon: '🐾', color: '#84cc16', rule: 'needs' },
    { id: 'gifts', name: 'Regali', icon: '🎁', color: '#f43f5e', rule: 'wants' },
    { id: 'restaurant', name: 'Ristorante', icon: '🍽️', color: '#f59e0b', rule: 'wants' },
    { id: 'food', name: 'Spesa', icon: '🛒', color: '#f97316', rule: 'needs' },
    { id: 'fun', name: 'Svago', icon: '🎮', color: '#a855f7', rule: 'wants' },
    { id: 'transport', name: 'Trasporti', icon: '🚗', color: '#8b5cf6', rule: 'needs' },
    { id: 'travel', name: 'Viaggi', icon: '✈️', color: '#0ea5e9', rule: 'wants' },
    { id: 'other', name: 'Altro', icon: '📦', color: '#6b7280', rule: 'needs' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

export function getCategoryById(id: string) {
    return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
