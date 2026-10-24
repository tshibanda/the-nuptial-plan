import type { Payment } from '@workspace/api-client-react';

export type PaymentSectionKey = 'overdue' | 'due' | 'paid';

export type PaymentSection = {
  key: PaymentSectionKey;
  data: Payment[];
};

export function organizePayments(payments: readonly Payment[]) {
  const sorted = [...payments].sort((a, b) => {
    const order = (status: string) => {
      switch (status) {
        case 'overdue': return 0;
        case 'pending': return 1;
        case 'scheduled': return 2;
        case 'paid': return 3;
        default: return 4;
      }
    };
    const statusDifference = order(a.status) - order(b.status);
    return statusDifference || a.dueDate.localeCompare(b.dueDate);
  });

  const groups: Record<PaymentSectionKey, Payment[]> = {
    overdue: [],
    due: [],
    paid: [],
  };

  for (const payment of sorted) {
    if (payment.status === 'overdue') groups.overdue.push(payment);
    else if (payment.status === 'pending' || payment.status === 'scheduled') groups.due.push(payment);
    else if (payment.status === 'paid') groups.paid.push(payment);
  }

  const sections = (Object.entries(groups) as [PaymentSectionKey, Payment[]][])
    .filter(([, data]) => data.length > 0)
    .map(([key, data]) => ({ key, data }));

  return { sorted, sections };
}
