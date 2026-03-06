export function formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(numericValue);
}
