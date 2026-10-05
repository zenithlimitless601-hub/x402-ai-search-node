import express from 'express';
import axios from 'axios';
import { paymentMiddleware } from '@x402/express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x6b2fdae695461252064B6F8AE41747ead71cD399";

// Public Homepage (Render Health Check)
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// Configure official x402 V2 Paywall
app.use(
  paymentMiddleware({
    payTo: RECEIVING_WALLET,
    routes: {
      "POST /api/v1/search": {
        price: "$0.002",
        network: "base", // Automatically resolves to Base Mainnet (eip155:8453)
        description: "Real-time AI Web Search & Synthesis Feed"
      }
    }
  })
);

// Protected Endpoint
app.post('/api/v1/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' parameter in request body." });
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
  console.log(`x402 Server online on port ${PORT}`);
});
