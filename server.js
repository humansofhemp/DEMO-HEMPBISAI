import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDigest } from './services/geminiService.js';

// Replicate __dirname functionality in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// API endpoint for generating the digest
app.get('/api/generate-digest-now', async (req, res) => {
  console.log("Received request to generate digest.");
  try {
    const digest = await generateDigest();
    res.json({ digest });
  } catch (error) {
    console.error("Error generating digest:", error);
    res.status(500).json({ error: "Failed to generate digest." });
  }
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA (Single Page Application) routing, send all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
