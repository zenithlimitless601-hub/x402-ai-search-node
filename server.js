import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Replace with your real Coinbase Wallet / EVM address on Base
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x6b2fdae695461252064B6F8AE41747ead71cD399";

// Base Mainnet Native USDC Token Address
const BASE_USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Public Health Check
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// Protected Search Endpoint
app.post('/api/v1/search', async (req, res) => {
  const paymentHeader = req.headers['x-payment'] || req.headers['payment-signature'];

  // 1. If no payment header present, send valid x402 V2 Payment Specs
  if (!paymentHeader) {
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453", // EIP-155 Chain ID for Base Mainnet
          asset: BASE_USDC_CONTRACT,
          amount: "2000", // $0.002 USDC (USDC has 6 decimals, 2000 units = $0.002)
          payTo: RECEIVING_WALLET,
          maxTimeoutSeconds: 60,
          extra: {
            name: "USDC",
            version: "2"
          }
        }
      ],
      resource: {
        url: `${req.protocol}://${req.get('host')}/api/v1/search`,
        description: "Real-time AI Web Search & Synthesis"
      }
    };

    const encodedHeader = Buffer.from(JSON.stringify(paySpec), 'utf-8').toString('base64');
    
    res.setHeader('PAYMENT-REQUIRED', encodedHeader);
    return res.status(402).json({
      x402Version: 2,
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      accepts: paySpec.accepts
    });
  }

  // 2. Execute Service post-payment
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
