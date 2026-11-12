type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeTransactions(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function notifyTransactionChange() {
  listeners.forEach(listener => listener());
}
