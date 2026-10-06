import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
// Set this in your Render Environment Variables or replace with your 0x address
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0xA69d6964d7422aaac8191a351236Fa3a8bF8E127";

// 1. Global CORS Middleware (Mandatory for Bazaar cross-origin probes)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Payment-Signature, X-Payment, Authorization, x-bazaar-probe');
  res.setHeader('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, Payment-Required');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. Health Check
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.001 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// 3. OpenAPI Spec Route for Bazaar Import
app.get('/openapi.json', (req, res) => {
  const host = req.get('host');
  res.json({
    openapi: "3.0.0",
    info: {
      title: "x402 AI Web Search Service",
      description: "Real-time web search synthesis paid via x402 micropayments on Base.",
      version: "1.0.0"
    },
    servers: [
      {
        url: `https://${host}`,
        description: "Production Server"
      }
    ],
    paths: {
      "/api/v1/search": {
        post: {
          summary: "Execute AI Web Search",
          operationId: "executeSearch",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["query"],
                  properties: {
                    query: {
                      type: "string",
                      example: "latest crypto market news"
                    }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Search results retrieved successfully" },
            "402": { description: "Payment Required ($0.001 USDC on Base)" }
          }
        }
      }
    }
  });
});

// 4. Protected Search Endpoint
app.post('/api/v1/search', async (req, res) => {
  const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'] || req.headers['authorization'];

  if (!paymentHeader) {
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Strict lowercase
          amount: "1000",
          payTo: RECEIVING_WALLET,
          maxTimeoutSeconds: 60,
          extra: {
            name: "USD Coin",
            version: "2"
          }
        }
      ],
      resource: {
        url: "https://x402-ai-search-node-1.onrender.com/api/v1/search",
        description: "Real-time AI Web Search & Synthesis"
      }
    };

    const encodedHeader = Buffer.from(JSON.stringify(paySpec), 'utf-8').toString('base64');

    res.setHeader('PAYMENT-REQUIRED', encodedHeader);
    res.setHeader('Payment-Required', encodedHeader);
    
    return res.status(402).json({
      x402Version: 2,
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      accepts: paySpec.accepts
    });
  }

  // Handle request logic after valid payment...
});

  // --- REAL SEARCH EXECUTION FOR PAID CLIENTS ---
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
  console.log(`x402 Server running on port ${PORT}`);
});
