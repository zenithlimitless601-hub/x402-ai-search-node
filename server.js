import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
// Make sure this is set to your actual Coinbase Wallet address in Render Environment Variables
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

// Protected Endpoint with Native x402 V2 Specs
app.post('/api/v1/search', async (req, res) => {
  const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'];

  // Send 402 Payment Required if no payment header exists
  if (!paymentHeader) {
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453", // Official CAIP-2 ID for Base Mainnet
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Native USDC
          price: "$0.002",
          payTo: RECEIVING_WALLET
        }
      ],
      resource: {
        url: `${req.protocol}://${req.get('host')}/api/v1/search`,
        description: "Real-time AI Web Search Feed"
      }
    };

    // Encode spec into base64 as required by x402 V2
    const encodedHeader = Buffer.from(JSON.stringify(paySpec)).toString('base64');

    res.setHeader('PAYMENT-REQUIRED', encodedHeader);
    return res.status(402).json({
      x402Version: 2,
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      accepts: paySpec.accepts
    });
  }

  // Service execution after payment header is attached
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

// Public OpenAPI schema for Bazaar indexing
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "x402 High-Volume AI Web Search API",
      version: "1.0.0",
      description: "Real-time web search synthesis paid via x402 micropayments on Base."
    },
    paths: {
      "/api/v1/search": {
        post: {
          summary: "Search web and return structured snippets",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    query: { type: "string", example: "latest AI news" }
                  },
                  required: ["query"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Successful Search Result" },
            "402": { description: "Payment Required ($0.002 USDC)" }
          }
        }
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`x402 Server running on port ${PORT}`);
});
