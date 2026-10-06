import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Set your receiving wallet address via environment variable or replace default fallback
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0xa69d6964d7422aaac8191a351236fa3a8bf8e127";

// -----------------------------------------------------------------------------
// 1. GLOBAL CORS MIDDLEWARE
// Explicitly exposes payment headers for cross-origin Web3 indexers & crawlers
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 2. HEALTH CHECK ROUTE
// -----------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// -----------------------------------------------------------------------------
// 3. OPENAPI SPECIFICATION ROUTE
// Direct schema endpoint for Bazaar, Agentic.Market, and x402-list importers
// -----------------------------------------------------------------------------
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "x402 AI Web Search Service",
      description: "Real-time web search synthesis paid via x402 USDC micropayments on Base Mainnet.",
      version: "1.0.0"
    },
    servers: [
      {
        url: "https://x402-ai-search-node-1.onrender.com",
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
            "402": { description: "Payment Required ($0.002 USDC on Base)" }
          }
        }
      }
    }
  });
});

// -----------------------------------------------------------------------------
// 4. PROTECTED SEARCH ENDPOINT
// -----------------------------------------------------------------------------
app.post('/api/v1/search', async (req, res) => {
  // Extract payment header (supports standard x402 casing variations)
  const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'] || req.headers['authorization'];

  // ---------------------------------------------------------------------------
  // CRITICAL STEP 1: PAYMENT CHALLENGE CHECK
  // Always trigger 402 challenge first BEFORE checking body or parameters!
  // ---------------------------------------------------------------------------
  if (!paymentHeader) {
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453", // Base Mainnet CAIP-2 ID
          asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base USDC (lowercase)
          amount: "2000", // $0.002 USDC in atomic units (6 decimals)
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

    // Encode exact UTF-8 Base64 JSON string
    const encodedHeader = Buffer.from(JSON.stringify(paySpec), 'utf-8').toString('base64');

    // Dual header assignment to guarantee reader compatibility
    res.setHeader('PAYMENT-REQUIRED', encodedHeader);
    res.setHeader('Payment-Required', encodedHeader);
    
    return res.status(402).json({
      x402Version: 2,
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      accepts: paySpec.accepts
    });
  }

  // ---------------------------------------------------------------------------
  // STEP 2: BODY VALIDATION (Only runs after payment header is supplied)
  // ---------------------------------------------------------------------------
  const { query } = req.body || {};
  if (!query) {
    return res.status(400).json({ error: "Missing 'query' parameter in request body." });
  }

  // ---------------------------------------------------------------------------
  // STEP 3: SEARCH EXECUTION
  // ---------------------------------------------------------------------------
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

// Start Server
app.listen(PORT, () => {
  console.log(`x402 AI Search Node active on port ${PORT}`);
});
