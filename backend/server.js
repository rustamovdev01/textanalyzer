const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;
const XAI_API_KEY = process.env.XAI_API_KEY; // .env faylida API kalitini qo'shing
const XAI_API_URL = 'https://api.x.ai/grok3/analyze'; // Haqiqiy API endpointni https://x.ai/api dan tekshiring

// Fallback keyword-based sentiment analysis
const POSITIVE_WORDS = [
  'yaxshi', 'ajoyib', 'muvaffaqiyat', 'quvonch', 'baxt', 'zo‘r',
  'muhabbat', 'hurmat', 'mamnun', 'xursand', 'g‘urur', 'ishonch',
  'sog‘lom', 'tinch', 'osoyishta', 'foydali', 'baraka', 'omad'
];
const NEGATIVE_WORDS = [
  'yomon', 'xafa', 'qayg‘u', 'muammo', 'xato', 'qiyin', 'tashvish',
  'stress', 'qo‘rquv', 'bezovta', 'pushaymon', 'g‘azab', 'kulfat',
  'zulum', 'xavotir', 'yo‘qotish', 'hafsalasizlik', 'norozilik'
];

function fallbackAnalyzeText(text) {
  const charCount = text.replace(/\s/g, '').length;
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]\s*/).filter(s => s.trim());
  const sentenceCount = sentences.length;

  const positiveCount = words.filter(word => POSITIVE_WORDS.includes(word.toLowerCase())).length;
  const negativeCount = words.filter(word => NEGATIVE_WORDS.includes(word.toLowerCase())).length;
  const totalSentimentWords = positiveCount + negativeCount;

  let sentiment = 'neytral';
  let sentimentExplanation = '';
  let confidence = 0;
  let topicSummary = 'Matn qisqa yoki aniq mavzuni ifodalamaydi.';

  if (totalSentimentWords > 0) {
    confidence = Math.round((Math.max(positiveCount, negativeCount) / totalSentimentWords) * 100);
    if (positiveCount > negativeCount) {
      sentiment = 'ijobiy';
      sentimentExplanation = `Matn ijobiy kayfiyatni ifodalaydi, chunki "${POSITIVE_WORDS.filter(word => words.includes(word.toLowerCase())).join('", "')}" kabi so‘zlar ishlatilgan.`;
    } else if (negativeCount > positiveCount) {
      sentiment = 'salbiy';
      sentimentExplanation = `Matn salbiy his-tuyg‘ularni ifodalaydi, chunki "${NEGATIVE_WORDS.filter(word => words.includes(word.toLowerCase())).join('", "')}" kabi so‘zlar ishlatilgan.`;
    } else {
      sentimentExplanation = `Matn ijobiy va salbiy his-tuyg‘ular o‘rtasida muvozanatli.`;
    }
  } else {
    sentimentExplanation = 'Matnda aniq his-tuyg‘ular topilmadi.';
  }

  // Basic topic summary for fallback
  const frequentWords = words.filter(word => !POSITIVE_WORDS.includes(word.toLowerCase()) && !NEGATIVE_WORDS.includes(word.toLowerCase()));
  if (frequentWords.length > 0) {
    topicSummary = `Matn "${frequentWords.slice(0, 3).join('", "')}" so‘zlari atrofida bo‘lishi mumkin.`;
  }

  return (
    `Matn tahlili natijalari (qisman tahlil):\n` +
    `- Bo‘shliqsiz belgilarni soni: ${charCount}\n` +
    `- So‘zlar soni: ${wordCount}\n` +
    `- Jumlalar soni: ${sentenceCount}\n` +
    `- Hissiyot tahlili: ${sentiment}\n` +
    `  Tahlil tafsilotlari: ${sentimentExplanation} Ishonch darajasi: ${confidence}%.\n` +
    `- Matn mavzusi: ${topicSummary}\n` +
    `Xulosa: Matn ${sentenceCount} ta jumladan va ${wordCount} ta so‘zdan iborat bo‘lib, ${sentiment} kayfiyatni ifodalaydi.`
  );
}

async function analyzeTextWithGrok(text) {
  const charCount = text.replace(/\s/g, '').length;
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]\s*/).filter(s => s.trim());
  const sentenceCount = sentences.length;

  try {
    const prompt = `
      Quyidagi matnni chuqur tahlil qiling va natijalarni o‘zbek tilida, professional, qiziqarli va tushunarli tarzda taqdim eting. Tahlil quyidagi qismlarni o‘z ichiga olishi kerak:
      1. Hissiyot tahlili: Matn ijobiy, salbiy yoki neytralmi? Ishonch darajasini (0-100%) va his-tuyg‘ular, ohang, niyat hamda muhim so‘z yoki iboralarni keltirib, batafsil tushuntirish bering.
      2. Kontekst tahlili: Matnning asosiy mavzulari, his-tuyg‘ulari, madaniy jihatlari yoki yashirin ma’nolari haqida tahlil qiling. Muhim naqsh yoki g‘oyalarni aniqlang.
      3. Matn mavzusi: Matnning asosiy maqsadi yoki mavzusini 1-2 jumlada aniq va qiziqarli ifodalang.
      Natijalar faqat o‘zbek tilida bo‘lsin, inglizcha so‘zlar ishlatilmang, belgilarni soni kabi takroriy ma’lumotlarni xulosada keltirmang. Matn: "${text}"
    `;

    const response = await axios.post(XAI_API_URL, {
      prompt: prompt,
      output_language: 'uz'
    }, {
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const { sentiment, confidence, explanation, topic } = response.data;

    return (
      `Matn tahlili natijalari:\n` +
      `- Bo‘shliqsiz belgilarni soni: ${charCount}\n` +
      `- So‘zlar soni: ${wordCount}\n` +
      `- Jumlalar soni: ${sentenceCount}\n` +
      `- Hissiyot tahlili: ${sentiment}\n` +
      `  Tahlil tafsilotlari: ${explanation} Ishonch darajasi: ${Math.round(confidence * 100)}%.\n` +
      `- Matn mavzusi: ${topic}\n` +
      `Xulosa: Ushbu matn ${sentiment} kayfiyatni ifodalab, asosan ${topic.toLowerCase()}.`
    );
  } catch (error) {
    console.error('Grok API xatosi:', error.message);
    return fallbackAnalyzeText(text);
  }
}

app.post('/analyze', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Matn kiritilmadi.' });
  }

  if (text.includes('?') || ['nima', 'qanday', 'qachon', 'nega'].some(word => text.toLowerCase().includes(word))) {
    return res.status(400).json({ error: 'Faqat matn tahlili uchun kiriting, savollarga javob berilmaydi.' });
  }

  if (text.replace(/\s/g, '').length > 5000) {
    return res.status(400).json({ error: 'Matn 5000 belgidan oshmasligi kerak.' });
  }

  const result = await analyzeTextWithGrok(text);
  res.json({ result });
});

app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} da ishlamoqda`);
});