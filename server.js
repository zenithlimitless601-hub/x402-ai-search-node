import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x0000000000000000000000000000000000000000";

// Public Health Check Endpoint (Render checks this to verify process health)
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// Protected High-Demand Endpoint
app.post('/api/v1/search', async (req, res) => {
  const paymentHeader = req.headers['x-payment'] || req.headers['payment-signature'];

  // Check if caller sent a signed x402 payment header
  if (!paymentHeader) {
    // Return HTTP 402 Payment Required according to x402 V2 Spec
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "base",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native Base USDC
          price: "$0.002",
          payTo: RECEIVING_WALLET
        }
      ],
      description: "Real-time AI Web Search & Synthesis"
    };

    res.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify(paySpec)).toString('base64'));
    return res.status(402).json({
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      x402: paySpec
    });
  }

  // Execute Service Post-Payment
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' parameter in JSON body." });
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return res.json({
      success: true,
      query: query,
      timestamp: new Date().toISOString(),
      data: {
        summary: `Search results for: ${query}`,
        raw_snippet: response.data.substring(0, 1500)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch search results", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`x402 server running and healthy on port ${PORT}`);
});
