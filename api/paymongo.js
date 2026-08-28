export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items } = req.body;

  try {
    // Trim secret key to prevent accidental spacing issues from Vercel settings
    const secretKey = process.env.PAYMONGO_SECRET_KEY ? process.env.PAYMONGO_SECRET_KEY.trim() : null;
    
    if (!secretKey) {
      return res.status(500).json({ error: 'PayMongo secret key is missing in Vercel environment variables.' });
    }

    // Base64 encode the secret key for PayMongo Basic Auth
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    // Dynamic origin fallback (matches greggy-s-website.vercel.app automatically)
    const origin = req.headers.origin || 'https://greggy-s-website.vercel.app';

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: items.map(item => ({
              currency: 'PHP',
              amount: Math.round(parseFloat(item.price) * 100), // Convert PHP to centavos
              name: item.title,
              quantity: 1
            })),
            payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
            success_url: `${origin}/`,
            cancel_url: `${origin}/`
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors?.[0]?.detail || 'Failed to generate PayMongo checkout session.';
      return res.status(response.status).json({ error: errorMsg });
    }

    return res.status(200).json({ checkoutUrl: data.data.attributes.checkout_url });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
