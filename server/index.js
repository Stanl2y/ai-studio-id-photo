import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Missing required environment variable: GEMINI_API_KEY');
  process.exit(1);
}

const app = express();
app.use(cors({
  origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(',').map(origin => origin.trim()),
}));
app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/generate', async (req, res) => {
  const { imageBase64, mimeType, prompt } = req.body ?? {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 (base64-encoded image data) is required.' });
  }
  if (!mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({ error: 'mimeType is required.' });
  }
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const imagePart = response?.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) {
      return res.json({ imageBase64: imagePart.inlineData.data });
    }

    const blockReason = response?.promptFeedback?.blockReason;
    if (blockReason) {
      return res.status(400).json({ error: `이미지 생성이 거부되었습니다: ${blockReason}` });
    }

    const textResponse = response.text;
    if (textResponse) {
      console.warn('Gemini returned text instead of an image:', textResponse);
      return res.status(502).json({ error: `AI가 이미지를 반환하지 않았습니다: ${textResponse}` });
    }

    console.error('Unexpected Gemini response structure:', JSON.stringify(response, null, 2));
    return res.status(502).json({ error: 'AI에서 유효한 이미지 응답을 받지 못했습니다.' });
  } catch (error) {
    console.error('Failed to generate ID photo:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`AI ID Photo backend listening on port ${PORT}`);
});
