// Servidor opcional para crear sesiones de pago (Stripe) y servir estático.
// Si no quieres pagos reales, no es necesario ejecutar este backend.
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || null;
let stripe = null;
if (STRIPE_SECRET) {
  stripe = require('stripe')(STRIPE_SECRET);
}

// Endpoint simple que crea una sesión de checkout para "estilo"
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(400).json({ error: "Stripe no configurado. Usa modo local." });
  const { price, styleId, successUrl, cancelUrl } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: {
        currency: 'usd',
        product_data: { name: `Estilo: ${styleId}` },
        unit_amount: Math.round(price * 100),
      }, quantity: 1 }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Sirve frontend si colocas build estático aquí (opcional)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}. Stripe configured: ${!!stripe}`);
});
