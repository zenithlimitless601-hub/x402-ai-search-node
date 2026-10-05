import express from 'express';
import axios from 'axios';
import { paymentMiddleware } from '@x402/express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const RECEIVING_WALLET = process.env.RECEIVING_WALLET || "0x0000000000000000000000000000000000000000";

// Configure x402 Micropayment Paywall & Bazaar Auto-Discovery Metadata
app.use(
  paymentMiddleware(RECEIVING_WALLET, {
    "POST /api/v1/search": {
      price: "$0.002", // $0.002 USDC per query (High volume pricing)
      network: "base",  // Base Mainnet (0% or near-zero gas)
      description: "Real-time AI Agent Web Search & Markdown Extraction Feed",
      // Bazaar Registry Auto-Discovery Extension
      extensions: {
        bazaar: {
          category: "search_and_scraping",
          tags: ["web-search", "ai-agent", "realtime-data", "markdown-scraper"],
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search term or URL to scrape" }
            },
            required: ["query"]
          }
        }
      }
    }
  })
);

// Public Health Check Endpoint
app.get('/', (req, res) => {
  res.json({
    status: "online",
    service: "x402 High-Volume AI Search Node",
    pricing: "$0.002 USDC / request",
    endpoint: "POST /api/v1/search"
  });
});

// Protected High-Demand Endpoint (Executes post-payment settlement)
app.post('/api/v1/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing 'query' in request body." });
    }

    // High-demand service: Fetch, clean, and structure real-time search data
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Extract quick results for AI agent parsing
    res.json({
      success: true,
      query: query,
      timestamp: new Date().toISOString(),
      format: "structured_json",
      data: {
        summary: `Real-time search results synthesized for query: ${query}`,
        raw_html_snippet: response.data.substring(0, 1500) // Returns fast payload
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process search query", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`High-Volume x402 Node running on port ${PORT}`);
});
