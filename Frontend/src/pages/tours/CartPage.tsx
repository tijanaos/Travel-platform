import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toursClient } from '../../api/client';
import { ShoppingCart, TourPurchaseToken } from '../../types';

export default function CartPage() {
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [tokens, setTokens] = useState<TourPurchaseToken[] | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    toursClient.get('/api/cart').then(res => setCart(res.data)).catch(() => setError('Failed to load cart'));
  }, []);

  async function removeItem(itemId: number) {
    try {
      const res = await toursClient.delete(`/api/cart/items/${itemId}`);
      setCart(res.data);
    } catch {
      setError('Failed to remove item');
    }
  }

  async function checkout() {
    try {
      const res = await toursClient.post('/api/cart/checkout');
      setTokens(res.data);
      setCart(prev => prev ? { ...prev, items: [], totalPrice: 0 } : prev);
    } catch {
      setError('Checkout failed');
    }
  }

  if (!cart) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ marginBottom: 20 }}>Shopping Cart</h2>

      {error && (
        <p style={{ color: '#dc3545', background: '#fff0f0', padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
          {error}
        </p>
      )}

      {tokens && (
        <div style={{ background: '#f0fff4', border: '1px solid #b7eb8f', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h3 style={{ color: '#389e0d', marginBottom: 12 }}>Checkout successful!</h3>
          {tokens.map(t => (
            <div key={t.id} style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#555' }}>Tour #{t.tourId} — Token: </span>
              <code style={{ fontSize: 12, background: '#e6ffed', padding: '2px 6px', borderRadius: 4 }}>{t.token}</code>
            </div>
          ))}
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/tours')}>
            Browse More Tours
          </button>
        </div>
      )}

      {cart.items.length === 0 && !tokens ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#888', marginBottom: 16 }}>Your cart is empty.</p>
          <button className="btn-primary" onClick={() => navigate('/tours')}>Browse Tours</button>
        </div>
      ) : cart.items.length > 0 && (
        <div className="card">
          {cart.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong style={{ fontSize: 15 }}>{item.tourName}</strong>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>${item.price.toFixed(2)}</p>
              </div>
              <button className="btn-secondary" onClick={() => removeItem(item.id)}>Remove</button>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4 }}>
            <strong style={{ fontSize: 16 }}>Total: ${cart.totalPrice.toFixed(2)}</strong>
            <button className="btn-primary" onClick={checkout}>Checkout</button>
          </div>
        </div>
      )}
    </div>
  );
}
