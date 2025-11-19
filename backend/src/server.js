import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { producers, ads, producerOffers, messages } from './data/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? true;

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/producers', (_, res) => {
  res.json({ data: producers });
});

app.get('/api/ads', (_, res) => {
  res.json({ data: ads });
});

app.get('/api/offers', (_, res) => {
  res.json({ data: producerOffers });
});

app.get('/api/messages', (_, res) => {
  res.json({ data: messages });
});

app.post('/api/messages', (req, res) => {
  const { producerId, sender, contact, message } = req.body ?? {};

  if (!producerId || !sender || !contact || !message) {
    return res.status(400).json({ error: 'Les champs producerId, sender, contact et message sont requis.' });
  }

  const newMessage = {
    id: `m${messages.length + 1}`,
    producerId,
    sender,
    contact,
    message,
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  res.status(201).json({ data: newMessage });
});

app.listen(PORT, () => {
  console.log(`API LaineBrute prête sur http://localhost:${PORT}`);
});
