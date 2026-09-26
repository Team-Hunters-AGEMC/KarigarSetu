export interface CustomerUser {
  id: number;
  customer_uid?: string;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pin_code?: string;
}

export function getCurrentCustomer(): CustomerUser | null {
  try {
    const raw = localStorage.getItem('karigarsetu_customer');
    if (raw) {
      const customer = JSON.parse(raw) as CustomerUser;
      if (customer && customer.id) {
        if (sessionStorage.getItem('karigarsetu_customer_verified') !== String(customer.id)) {
          sessionStorage.setItem('karigarsetu_customer_verified', String(customer.id));
        }
        return customer;
      }
    }
  } catch (e) {
    console.warn('Customer parse error', e);
  }
  return null;
}

export function setCurrentCustomer(customer: CustomerUser | null) {
  if (customer) {
    localStorage.setItem('karigarsetu_customer', JSON.stringify(customer));
    sessionStorage.setItem('karigarsetu_customer_verified', String(customer.id));
  } else {
    localStorage.removeItem('karigarsetu_customer');
    sessionStorage.removeItem('karigarsetu_customer_verified');
  }
  window.dispatchEvent(new Event('karigarsetu_customer_updated'));
}

export function logoutCustomer() {
  void fetch('/api/customers/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  setCurrentCustomer(null);
}

export function getCartCount(): number {
  try {
    const cart = JSON.parse(localStorage.getItem('karigarsetu_cart') || '[]');
    if (Array.isArray(cart)) {
      return cart.reduce((total, item) => total + (item.quantity || 1), 0);
    }
  } catch {}
  return 0;
}
