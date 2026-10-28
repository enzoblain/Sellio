const euroFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** Formate un montant en centimes en euros (fr-FR). */
export const euros = (cents: number) => euroFormat.format(cents / 100);
