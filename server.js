const express = require("express");
const axios = require("axios");
const cors = require("cors");
const vader = require("vader-sentiment");
require("dotenv").config();

const app = express();
const PORT = process.env.VITE_PORT || 3000;
const NEWS_API_KEY = process.env.VITE_NEWS_API_KEY;

const SOURCES = [
  "cnn",
  "reuters",
  "bbc-news",
  "the-wall-street-journal",
  "associated-press",
  "bloomberg",
  "fox-news",
  "the-times-of-india",
];

// CORS configuration
app.use(
  cors({
    origin: [
      "https://wandergram1.vercel.app", 
      "http://localhost:5173",  // Add your local development URL
      "http://localhost:3000"
    ],
    methods: ["GET", "OPTIONS"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

// Summarization utility function
function simpleSummarize(text, numSentences = 2) {
  const sentences = text.split(". ");
  return sentences.slice(0, numSentences).join(". ") + (sentences.length > numSentences ? "." : "");
}

// News endpoint
app.get("/news", async (req, res) => {
  try {
    // Fetch articles from all sources
    const requests = SOURCES.map((source) =>
      axios.get(`https://newsapi.org/v2/top-headlines?sources=${source}&apiKey=${NEWS_API_KEY}`)
    );

    const responses = await Promise.all(requests);
    const articles = responses.flatMap((response) => response.data.articles || []);

    // Process articles
    const analyzedArticles = articles.map((article) => {
      const description = article.description || "No description available";

      const sentimentResult = vader.SentimentIntensityAnalyzer.polarity_scores(description);
      const sentiment =
        sentimentResult.compound >= 0.05
          ? "Positive"
          : sentimentResult.compound <= -0.05
          ? "Negative"
          : "Neutral";

      // Generate summary or fallback
      let summary = "No summary available";
      if (description.length > 50) {
        try {
          summary = simpleSummarize(description, 2);
        } catch (err) {
          console.error("Error generating summary:", err.message);
        }
      } else {
        summary = "Description too short to summarize.";
      }

      return { ...article, sentiment, summary };
    });

    res.status(200).json({ articles: analyzedArticles });
  } catch (error) {
    console.error("Error fetching news:", error.response?.data || error.message);
    res.status(500).json({ error: `Unable to fetch news: ${error.message}` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
