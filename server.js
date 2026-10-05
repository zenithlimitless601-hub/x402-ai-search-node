import express from 'express';
import axios from 'axios';
import { paymentMiddleware } from '@x402/express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x0000000000000000000000000000000000000000";

// Public Homepage (Render checks this to verify your app is healthy)
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 High-Volume AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// Configure x402 Micropayment Paywall
app.use(
  paymentMiddleware(RECEIVING_WALLET, {
    "POST /api/v1/search": {
      price: "$0.002",
      network: "base",
      description: "Real-time AI Agent Web Search Feed"
    }
  })
);

// Protected Endpoint
app.post('/api/v1/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' in request body." });
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    res.json({
      success: true,
      query: query,
      timestamp: new Date().toISOString(),
      data: {
        summary: `Search results synthesized for: ${query}`,
        raw_html_snippet: response.data.substring(0, 1500)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process search query", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`x402 Server successfully started on port ${PORT}`);
});
