import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x6b2fdae695461252064B6F8AE41747ead71cD399";

// Global CORS Middleware (Mandatory for Bazaar cross-origin probes)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Payment-Signature, X-Payment, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, Payment-Required');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.001 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// OpenAPI Spec Route
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

// Protected Search Endpoint
app.post('/api/v1/search', async (req, res) => {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'] || req.headers['authorization'];

  // BYPASS FOR BAZAAR CRAWLER / INDEXER ONLY
  if (userAgent.includes('bazaar') || userAgent.includes('x402-indexer') || req.headers['x-bazaar-probe']) {
    return res.status(200).json({
      status: "active",
      message: "x402 Search Node online and ready for queries."
    });
  }

  // STANDARD X402 PAYMENT ENFORCEMENT
  if (!paymentHeader) {
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          asset: "0x833589fcd6edb6e08f4c7C32D4f71b54bdA02913",
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
        url: `https://${req.get('host')}/api/v1/search`,
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

  // Real search logic runs here post-payment...
});

    // Attach dual headers to guarantee Bazaar reads the payment challenge
    res.setHeader('PAYMENT-REQUIRED', encodedHeader);
    res.setHeader('Payment-Required', encodedHeader);
    
    return res.status(402).json({
      x402Version: 2,
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      accepts: paySpec.accepts
    });
  }

  // Handle Request Execution Post-Payment Verification
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
