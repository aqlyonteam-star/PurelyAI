import { GoogleGenAI } from "@google/genai";
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import Groq from 'groq-sdk';
import { Resend } from 'resend';
import { requireAuth, AuthRequest } from './middleware/auth.ts';

const groqApiKey = (process.env.GROQ_API_KEY || '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').trim();
const nvidiaApiKey = (process.env.NVIDIA_API_KEY || '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').trim();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function generateAIResponse(messages: any[], modelInfo: any = {}, onProvider?: (provider: string) => void) {
  try {
    let systemInstruction = undefined;
    const geminiMessages = messages.map(m => {
      if (m.role === 'system') {
        systemInstruction = m.content;
        return null;
      }
      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{text: m.content}]
      };
    }).filter(Boolean);
    
    const targetModel = modelInfo.model || 'gemini-3.6-flash';
    const isChat = modelInfo.isChat || false;
    
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: geminiMessages as any,
      config: {
        systemInstruction: systemInstruction ? systemInstruction + (isChat ? "\n\nCRITICAL: Keep your response extremely concise, direct, and under 150 words. Do not ramble. Speed is the absolute priority." : "") : (isChat ? "CRITICAL: Keep your response extremely concise, direct, and under 150 words. Do not ramble. Speed is the absolute priority." : undefined),
        temperature: 0.2,
        maxOutputTokens: modelInfo.maxTokens || undefined,
      }
    });
    if (response.text) {
      return response.text;
    }
  } catch (e: any) {
    console.error("Model failed:", e);
    throw { fallback: true, messages };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email setup using Resend
  const resend = new Resend('re_55oz1mCN_6q6w5b5oNN68QSfjxUj56cRd');

  // API Routes
  
  app.post('/api/principles', requireAuth, async (req, res) => {
    const { skill } = req.body;
    try {
      const resp = await generateAIResponse([
        {
          role: 'system',
          content: 'You are an expert tutor. Output EXACTLY 5 core principles one must master to learn the given skill. Format as a strict JSON array of strings, e.g. ["Principle 1", "Principle 2"]. No other text.'
        },
        {
          role: 'user',
          content: `Skill: ${skill}`
        }
      ]);
      let cleanResp = resp.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const match = cleanResp.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) cleanResp = match[0];
      let principles = JSON.parse(cleanResp);
      if (principles.principles) principles = principles.principles;
      if (!Array.isArray(principles)) principles = ["Foundation", "Core Concepts", "Advanced Mechanics", "Practical Application", "Mastery"];
      res.json({ principles });
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  app.post('/api/principle-content', requireAuth, async (req, res) => {
    const { skill, principle } = req.body;
    try {
      const content = await generateAIResponse([
        {
          role: 'system',
          content: 'You are an expert tutor. Provide detailed, engaging study notes on the given principle for the skill. Include a diagram using Mermaid.js if applicable (wrapped in ```mermaid). Make it easy to read, use analogies.'
        },
        {
          role: 'user',
          content: `Skill: ${skill}\nPrinciple: ${principle}`
        }
      ]);
      res.json({ content });
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  app.post('/api/principle-test', requireAuth, async (req, res) => {
    const { skill, principle } = req.body;
    try {
      const content = await generateAIResponse([
        {
          role: 'system',
          content: 'Generate ONE hard, practical test question regarding this principle. Return JUST the question text.'
        },
        {
          role: 'user',
          content: `Skill: ${skill}\nPrinciple: ${principle}`
        }
      ]);
      res.json({ question: content || 'Explain the core mechanism.' });
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  app.post('/api/send-code', async (req, res) => {
    const { email, code } = req.body;
    try {
      const { data, error } = await resend.emails.send({
        from: 'Purely <onboarding@resend.dev>',
        to: [email],
        subject: 'Your Purely Confirmation Code',
        text: `Your confirmation code is: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Purely</h2>
            <p>Your confirmation code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 4px; color: #10b981;">${code}</h1>
            <p>Enter this code to complete your signup.</p>
          </div>
        `,
      });
      
      if (error) {
        console.error('Resend error:', error);
        return res.status(400).json({ success: false, error });
      }

      res.json({ 
        success: true,
        data 
      });
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  app.post('/api/curriculum', requireAuth, async (req: AuthRequest, res) => {
    const { skill } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: 'You are an elite AI tutor creating a curriculum. Ensure a 20/80 split: 20% Foundation (theory) and 80% Application-Based Skills (projects, hands-on). Return ONLY a valid JSON object.'
          },
          {
            role: 'user',
            content: `I want to learn ${skill}. Generate a complete curriculum with 3-5 high-level modules, each containing 2-3 specific lessons. Return ONLY a JSON object in this format: { "title": "Course Title", "description": "Brief description", "modules": [ { "id": "m1", "title": "Module 1", "lessons": [ { "id": "m1l1", "title": "Lesson 1" } ] } ] }`
          }
        ]);

      let responseText = content || '{}';
      responseText = responseText.replace(/\x60\x60\x60json/g, '').replace(/\x60\x60\x60/g, '').trim();
      const match = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) responseText = match[0];
      res.json(JSON.parse(responseText));
    } catch (error: any) {
      if (error && error.fallback) {
         return res.status(503).json({ fallbackMessages: error.messages });
      }
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed' });
    }
  });

  app.post('/api/lesson', requireAuth, async (req: AuthRequest, res) => {
    const { skill, lessonTitle } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: `You are an elite AI tutor teaching a lesson on ${skill}.
Strictly follow a 20/80 split: 20% Teaching (Foundation) and 80% Application-Based-Skills.
Format the lesson starting with "### Stage 1: Foundation" and then "### Stage 2: Application".
Do not just give notes. Invent a highly engaging way of teaching.
Use very simple words, keywords, and analogies so anyone can immediately understand.
ABSOLUTELY NO technical jargon. Explain everything as simply as possible.`
          },
          {
            role: 'user',
            content: `Teach me about ${lessonTitle}. Make it interactive, simple, and analogy-driven. Use markdown formatting.`
          }
        ]);

      res.json({ content: content || '' });
    } catch (error: any) {
      if (error && error.fallback) {
         return res.status(503).json({ fallbackMessages: error.messages });
      }
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed' });
    }
  });

  app.post('/api/chat', requireAuth, async (req: AuthRequest, res) => {
    const { history, message, context } = req.body;
    try {
      const messages: any[] = [
        {
          role: 'system',
          content: `You are an elite AI tutor for the Purely platform. You are currently helping the user with their course: ${context}. Answer their questions in a helpful, encouraging, and detailed manner.`
        }
      ];

      history.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.text
        });
      });

      messages.push({ role: 'user', content: message });

      const content = await generateAIResponse(messages, { 
        model: 'gemini-3.6-flash', 
        isChat: true, 
        maxTokens: 250 
      });

      res.json({ text: content || '' });
    } catch (error: any) {
      if (error && error.fallback) {
         return res.status(503).json({ fallbackMessages: error.messages });
      }
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed' });
    }
  });

  app.post('/api/ask-highlight', requireAuth, async (req: AuthRequest, res) => {
    const { text, question, context } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: 'You are an elite AI tutor. Answer questions about the highlighted text VERY simply and quickly. Keep it extremely brief (1-3 sentences max). Use simple words and analogies. NO technical jargon.'
          },
          {
            role: 'user',
            content: `Context: ${context}\nHighlighted Text: "${text}"\nQuestion: ${question}`
          }
      ]);

      res.json({ answer: content || '' });
    } catch (error: any) {
      if (error && error.fallback) {
         return res.status(503).json({ fallbackMessages: error.messages });
      }
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed' });
    }
  });


  app.post('/api/generate-test', requireAuth, async (req: AuthRequest, res) => {
    const { skill, lessonTitle } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: 'You are a strict examiner. Generate ONE extremely hard, practical test question about the lesson.'
          },
          {
            role: 'user',
            content: `Skill: ${skill}, Lesson: ${lessonTitle}. Give me a very hard test question. Return just the text of the question.`
          }
        ]);
      res.json({ question: content || 'What is the most complex aspect of this topic?' });
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  app.post('/api/verify-test', requireAuth, async (req: AuthRequest, res) => {
    const { skill, lessonTitle, question, answer } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: 'You are a strict examiner. Evaluate the answer to the hard question. Return JSON: { "passed": boolean, "feedback": "string explaining why" }'
          },
          {
            role: 'user',
            content: `Question: ${question}
User Answer: ${answer}

Evaluate strictly.`
          }
        ]);
      let cleanContent = (content || '{"passed":false,"feedback":"Failed due to AI error."}').replace(/\x60\x60\x60json/g, '').replace(/\x60\x60\x60/g, '').trim();
      const match = cleanContent.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) cleanContent = match[0];
      res.json(JSON.parse(cleanContent));
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  app.post('/api/generate-sandbox', requireAuth, async (req: AuthRequest, res) => {
    const { skill } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: 'You are an elite mentor creating a real-world sandbox challenge (80% Application). Generate a very hard, practical task for the user to complete. Format beautifully in Markdown.'
          },
          {
            role: 'user',
            content: `Skill: ${skill}. Give me a hard sandbox task.`
          }
        ]);
      res.json({ task: content || 'Build a full project using what you learned.' });
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  app.post('/api/verify-sandbox', requireAuth, async (req: AuthRequest, res) => {
    const { skill, task, submission } = req.body;
    try {
      const content = await generateAIResponse([
          {
            role: 'system',
            content: 'You are a senior engineer verifying a sandbox project submission. Return JSON: { "verified": boolean, "feedback": "string", "specialities": ["string"] }'
          },
          {
            role: 'user',
            content: `Task: ${task}
Submission: ${submission}

Verify this strictly. Extract 3 specialities.`
          }
        ]);
      let cleanContent = (content || '{"verified":false,"feedback":"Failed due to AI error.","specialities":[]}').replace(/```json/g, '').replace(/```/g, '').trim();
      res.json(JSON.parse(cleanContent));
    } catch (e: any) {
      if (e && e.fallback) {
         return res.status(503).json({ fallbackMessages: e.messages });
      }
      console.error(e);
      res.status(500).json({ error: e.message || 'Failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

