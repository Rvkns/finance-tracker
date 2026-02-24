export const CATEGORIES = [
    { id: 'clothing', name: 'Abbigliamento', icon: '👕', color: '#06b6d4' },
    { id: 'subscriptions', name: 'Abbonamenti', icon: '📱', color: '#14b8a6' },
    { id: 'bills', name: 'Bollette', icon: '⚡', color: '#ef4444' },
    { id: 'house', name: 'Casa', icon: '🏠', color: '#3b82f6' },
    { id: 'health', name: 'Farmacia/Salute', icon: '💊', color: '#ec4899' },
    { id: 'maui_health', name: 'Farmaci Maui', icon: '🩺', color: '#d946ef' },
    { id: 'maui', name: 'Maui', icon: '🐾', color: '#84cc16' },
    { id: 'gifts', name: 'Regali', icon: '🎁', color: '#f43f5e' },
    { id: 'restaurant', name: 'Ristorante', icon: '🍽️', color: '#f59e0b' },
    { id: 'food', name: 'Spesa', icon: '🛒', color: '#f97316' },
    { id: 'fun', name: 'Svago', icon: '🎮', color: '#a855f7' },
    { id: 'transport', name: 'Trasporti', icon: '🚗', color: '#8b5cf6' },
    { id: 'travel', name: 'Viaggi', icon: '✈️', color: '#0ea5e9' },
    { id: 'other', name: 'Altro', icon: '📦', color: '#6b7280' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

export function getCategoryById(id: string) {
    return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
