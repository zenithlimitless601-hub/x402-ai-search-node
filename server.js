import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x6b2fdae695461252064B6F8AE41747ead71cD399";

// 1. Health Check
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// OpenAPI Spec Route
app.get('/openapi.json', (req, res) => {
  // Always force https for production deployment on Render
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || 'https';

  res.json({
    openapi: "3.0.0",
    info: {
      title: "x402 AI Web Search Service",
      description: "Real-time web search synthesis paid via x402 micropayments on Base.",
      version: "1.0.0"
    },
    servers: [
      {
        url: `https://${host}`, // Explicit HTTPS fixes Bazaar's parser
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
                      description: "Search query string",
                      example: "latest crypto market news"
                    }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Search results retrieved successfully"
            },
            "402": {
              description: "Payment Required ($0.002 USDC on Base)"
            }
          }
        }
      }
    }
  });
});


// 3. Protected Search Endpoint
app.post('/api/v1/search', async (req, res) => {
  const paymentHeader = req.headers['payment-signature'] || req.headers['x-payment'];

  if (!paymentHeader) {
    const paySpec = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          amount: "2000",
          payTo: RECEIVING_WALLET,
          maxTimeoutSeconds: 60,
          extra: {
            name: "USD Coin",
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
    res.setHeader('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED');
    
    return res.status(402).json({
      x402Version: 2,
      error: "Payment Required",
      message: "Please attach signed x402 payment header to proceed.",
      accepts: paySpec.accepts
    });
  }

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
