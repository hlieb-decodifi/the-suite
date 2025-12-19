/**
 * Formats a number as a currency string (USD by default)
 */
export function formatCurrency(
  amount?: number | null,
  options: Intl.NumberFormatOptions = {},
  locale = 'en-US',
): string {
  if (!amount) {
    return 'N/A';
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });

  return formatter.format(amount);
}
