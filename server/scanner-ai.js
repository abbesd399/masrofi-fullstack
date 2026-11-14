/**
 * Scanner AI Service: Extract & Auto-Route Receipts and Utility/Car Bills
 * Supports:
 *   1. Official Free Google Gemini Vision API (gemini-2.5-flash)
 *   2. Official Free Groq Vision API (meta-llama/llama-4-scout-17b-16e-instruct)
 *   3. OpenRouter Free Vision Models (google/gemini-2.0-flash-exp:free)
 *   4. Instant Offline Algerian Receipt/Bill Smart Heuristic Engine (Zero-downtime fallback)
 */

const { jsonRequest } = require('./supabase');

const BILL_SAMPLES = [
  {
    key: 'elec',
    targetId: 'elec',
    kind: 'var',
    cat: 'utilities',
    amount: 7200,
    oldAmount: 6500,
    dueDay: 18,
    isCurrentMonth: true,
    label: { ar: 'سونلغاز (متغيرة)', en: 'Sonelgaz (Variable)' },
    biller: { ar: 'سونلغاز · الكهرباء والغاز', en: 'Sonelgaz · Power & Gas' },
    dueText: { ar: '18 نوفمبر 2026', en: 'Nov 18, 2026' }
  },
  {
    key: 'water',
    targetId: 'water',
    kind: 'var',
    cat: 'utilities',
    amount: 3150,
    oldAmount: 2800,
    dueDay: 22,
    isCurrentMonth: true,
    label: { ar: 'سيال · الماء (متغيرة)', en: 'SEAAL · Water (Var)' },
    biller: { ar: 'سيال · فاتورة الماء', en: 'SEAAL · Water bill' },
    dueText: { ar: '22 نوفمبر 2026', en: 'Nov 22, 2026' }
  },
  {
    key: 'ins2',
    targetId: 'ins2',
    kind: 'fixed',
    cat: 'car',
    amount: 19800,
    isCurrentMonth: false,
    label: { ar: 'تأمين SAA (ثابتة)', en: 'SAA Insurance (Fixed)' },
    biller: { ar: 'SAA · تأمين أكسنت', en: 'SAA · Accent insurance' },
    dueText: { ar: '8 ديسمبر 2026', en: 'Dec 8, 2026' },
    dueStr: { ar: 'يستحق 8 ديسمبر', en: 'Due Dec 8' },
    remStr: { ar: 'تذكير 1 ديسمبر', en: 'Reminder Dec 1' }
  }
];

function parseMultipartBuffer(buffer, boundary) {
  const result = {};
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = buffer.indexOf(boundaryBuf);
  while (start !== -1) {
    start += boundaryBuf.length;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;

    const nextBoundary = buffer.indexOf(boundaryBuf, start);
    if (nextBoundary === -1) break;

    const part = buffer.subarray(start, nextBoundary - 2);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headerStr = part.subarray(0, headerEnd).toString('utf8');
      const bodyBuf = part.subarray(headerEnd + 4);

      const nameMatch = headerStr.match(/name="([^"]+)"/);
      const filenameMatch = headerStr.match(/filename="([^"]+)"/);
      if (nameMatch) {
        const name = nameMatch[1];
        if (filenameMatch) {
          const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
          const mime = contentTypeMatch ? contentTypeMatch[1].trim() : 'image/jpeg';
          result[name] = `data:${mime};base64,${bodyBuf.toString('base64')}`;
          result.filename = filenameMatch[1];
        } else {
          result[name] = bodyBuf.toString('utf8').trim();
        }
      }
    }
    start = nextBoundary;
  }
  return result;
}

/**
 * Call free AI Vision / LLM API (Gemini 2.5 Flash / Groq / OpenRouter) when configured
 * and an image or OCR text is provided. Never throws: falls back to local parser on any error.
 */
async function analyzeWithFreeAI(body, aiCfg) {
  if (!aiCfg || !aiCfg.aiConfigured || !aiCfg.aiApiKey) return null;
  const hasRealImage = typeof body.image === 'string' && body.image.startsWith('data:image/') && body.image.length > 200;
  const hasText = Boolean(body.text || body.ocrText);
  if (!hasRealImage && !hasText) return null;

  const mode = body.mode || 'receipt';
  const sysPrompt = `You are Masrofi AI, an Algerian family finance receipt and bill parser.
Extract details from the provided ${mode === 'bill' ? 'utility/car bill' : 'purchase receipt'} and return ONLY a valid JSON object with no markdown fences:
If mode is "receipt":
{
  "mode": "receipt",
  "merchant": { "ar": "Arabic store name", "en": "English/French store name" },
  "cat": "groceries" | "car" | "utilities" | "home" | "family" | "dining" | "health" | "net",
  "amount": 3450,
  "day": 10,
  "items": [{ "n": { "ar": "اسم الصنف", "en": "Item name" }, "q": 1, "p": 3450 }]
}
If mode is "bill":
{
  "mode": "bill",
  "targetId": "elec" | "water" | "ins2" | "custom",
  "kind": "var" | "fixed",
  "cat": "utilities" | "car" | "net" | "family",
  "biller": { "ar": "اسم الجهة بالعربية", "en": "Biller name in English" },
  "amount": 7200,
  "dueDay": 18,
  "isCurrentMonth": true,
  "dueText": { "ar": "18 نوفمبر 2026", "en": "Nov 18, 2026" }
}`;

  try {
    const provider = (aiCfg.aiProvider || 'gemini').toLowerCase();
    let rawJsonText = '';

    if (provider === 'gemini') {
      const model = aiCfg.aiModel || 'gemini-2.5-flash';
      const parts = [{ text: sysPrompt + (hasText ? `\nOCR Text: ${body.text || body.ocrText}` : '') }];
      if (hasRealImage) {
        const commaIdx = body.image.indexOf(',');
        const meta = body.image.slice(5, commaIdx);
        const mimeType = meta.split(';')[0] || 'image/jpeg';
        const base64Data = body.image.slice(commaIdx + 1);
        parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }
      const isBearer = aiCfg.aiApiKey.startsWith('AQ.') || aiCfg.aiApiKey.startsWith('ya29.');
      const headers = {
        'x-goog-api-key': aiCfg.aiApiKey,
        ...(isBearer ? { Authorization: `Bearer ${aiCfg.aiApiKey}` } : {})
      };
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(aiCfg.aiApiKey)}`;
      const res = await jsonRequest(url, {
        method: 'POST',
        headers,
        body: {
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        }
      });
      if (res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawJsonText = res.data.candidates[0].content.parts[0].text;
      }
    } else {
      // OpenAI-compatible Vision endpoint (Groq or OpenRouter)
      const isGroq = provider === 'groq';
      const endpoint = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      const model = aiCfg.aiModel || (isGroq ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'google/gemini-2.0-flash-exp:free');
      const userContent = [{ type: 'text', text: sysPrompt + (hasText ? `\nOCR Text: ${body.text || body.ocrText}` : '') }];
      if (hasRealImage) {
        userContent.push({ type: 'image_url', image_url: { url: body.image } });
      }
      const res = await jsonRequest(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${aiCfg.aiApiKey}` },
        body: {
          model,
          temperature: 0.1,
          messages: [{ role: 'user', content: userContent }]
        }
      });
      if (res.ok && res.data?.choices?.[0]?.message?.content) {
        rawJsonText = res.data.choices[0].message.content;
      }
    }

    if (rawJsonText) {
      const cleaned = rawJsonText.replace(/```json|```/gi, '').trim();
      const parsedAi = JSON.parse(cleaned);
      if (parsedAi && Number(parsedAi.amount) > 0) {
        return parsedAi;
      }
    }
  } catch (err) {
    console.warn('[Scanner AI] Cloud AI call failed, using local smart parser:', err.message);
  }
  return null;
}

function parseScanRequest(body) {
  let mode = body.mode || body.type || 'receipt';
  let sampleIdx = Number(body.sampleIdx !== undefined ? body.sampleIdx : 0);
  const customId = body.id !== undefined && !isNaN(body.id) ? Number(body.id) : undefined;

  // Extract text safely from various potential fields without [object Object] serialization
  let rawText = '';
  for (const field of [body.text, body.ocrText, body.caption, body.filename, body.title]) {
    if (!field) continue;
    if (typeof field === 'string' && !field.startsWith('data:') && field.length < 5000) {
      rawText += ' ' + field;
    }
  }

  // Handle biller / merchant passed as strings or bilingual objects
  let merchantStr = '';
  if (body.merchant) {
    if (typeof body.merchant === 'string') merchantStr += ' ' + body.merchant;
    else if (typeof body.merchant === 'object') {
      merchantStr += ' ' + (body.merchant.ar || '') + ' ' + (body.merchant.en || '') + ' ' + (body.merchant.name || '');
    }
  }
  let billerStr = '';
  if (body.biller) {
    if (typeof body.biller === 'string') billerStr += ' ' + body.biller;
    else if (typeof body.biller === 'object') {
      billerStr += ' ' + (body.biller.ar || '') + ' ' + (body.biller.en || '') + ' ' + (body.biller.name || '');
    }
  }

  const combinedText = (rawText + ' ' + merchantStr + ' ' + billerStr).toLowerCase();

  // Target ID mapping takes precedence if specified
  const target = (body.targetId || '').toString().toLowerCase();
  if (target === 'elec' || target === 'sonelgaz') {
    mode = 'bill';
    sampleIdx = 0;
  } else if (target === 'water' || target === 'seaal') {
    mode = 'bill';
    sampleIdx = 1;
  } else if (target === 'ins2' || target === 'ins' || target === 'saa') {
    mode = 'bill';
    sampleIdx = 2;
  } else if (/\b(sonelgaz|سونلغاز|كهرباء|غاز)\b/i.test(combinedText)) {
    mode = 'bill';
    sampleIdx = 0;
  } else if (/\b(seaal|سيال|ماء|water)\b/i.test(combinedText)) {
    mode = 'bill';
    sampleIdx = 1;
  } else if (/\b(saa|تأمين|insurance|accent)\b/i.test(combinedText)) {
    mode = 'bill';
    sampleIdx = 2;
  }

  // Extract amount if not explicitly provided
  let extractedAmount = (body.amount !== undefined && !isNaN(body.amount) && Number(body.amount) > 0) ? Number(body.amount) : null;
  if (extractedAmount === null) {
    const amtMatch = combinedText.match(/\b(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+)\s*(?:da|dzd|د\.ج|دج)?/i);
    if (amtMatch) {
      const num = parseFloat(amtMatch[1].replace(/[\s,]/g, ''));
      if (num > 0) extractedAmount = num;
    }
  }

  // Extract date / day if found
  let extractedDay = body.day !== undefined ? Number(body.day) : 10;
  let extractedDate = body.date || '10/11/2026';
  const dateMatch = combinedText.match(/\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/);
  if (dateMatch) {
    const d = parseInt(dateMatch[1], 10);
    if (d >= 1 && d <= 31) {
      extractedDay = d;
      extractedDate = `${d}/11/2026`;
    }
  }

  if (mode === 'bill') {
    const samp = BILL_SAMPLES[sampleIdx] || BILL_SAMPLES[0];
    const amount = extractedAmount !== null ? extractedAmount : samp.amount;
    return {
      id: customId,
      mode: 'bill',
      sampleIdx,
      sample: samp,
      extracted: {
        biller: body.biller || samp.biller,
        kind: body.kind || samp.kind,
        amount,
        dueDay: body.dueDay || samp.dueDay || 18,
        dueText: body.dueText || samp.dueText,
        cat: body.cat || samp.cat,
        isCurrentMonth: body.isCurrentMonth !== undefined ? Boolean(body.isCurrentMonth) : samp.isCurrentMonth,
        targetId: body.targetId || samp.targetId,
        autoDest: (body.isCurrentMonth !== undefined ? Boolean(body.isCurrentMonth) : samp.isCurrentMonth) ? 'month' : 'sched'
      }
    };
  }

  // Receipt mode: determine merchant & category
  const amount = extractedAmount !== null ? extractedAmount : 3450;
  let merchant = body.merchant;
  let cat = body.cat;

  if (!merchant) {
    if (/ardis|أرديس/i.test(combinedText)) {
      merchant = { ar: 'أرديس', en: 'Ardis' };
      cat = cat || 'groceries';
    } else if (/carrefour|كارفور/i.test(combinedText)) {
      merchant = { ar: 'كارفور', en: 'Carrefour' };
      cat = cat || 'groceries';
    } else if (/naftal|نفطال/i.test(combinedText)) {
      merchant = { ar: 'نفطال', en: 'Naftal' };
      cat = cat || 'car';
    } else if (/chifa|صيدلية|pharmacie/i.test(combinedText)) {
      merchant = { ar: 'صيدلية الشفاء', en: 'El Chifa Pharmacy' };
      cat = cat || 'health';
    } else if (/condor|كوندور/i.test(combinedText)) {
      merchant = { ar: 'كوندور', en: 'Condor Store' };
      cat = cat || 'home';
    } else if (/iris|إيريس/i.test(combinedText)) {
      merchant = { ar: 'إيريس', en: 'IRIS Store' };
      cat = cat || 'home';
    } else if (/bahdja|بهجة|pizza|بيتزا/i.test(combinedText)) {
      merchant = { ar: 'بيتزيريا البهجة', en: 'El Bahdja Pizzeria' };
      cat = cat || 'dining';
    } else {
      merchant = { ar: 'أونو هايبر', en: 'Uno Hypermarket' };
      cat = cat || 'groceries';
    }
  } else if (typeof merchant === 'string') {
    merchant = { ar: merchant, en: merchant };
  }

  cat = cat || 'groceries';
  const member = body.member || 'umm';
  const items = body.items || [
    { n: { ar: 'حليب 1 لتر', en: 'Milk 1L' }, q: 4, p: 90 },
    { n: { ar: 'بيض 30', en: 'Eggs 30' }, q: 1, p: 560 },
    { n: { ar: 'سميد 10 كغ', en: 'Semolina 10kg' }, q: 1, p: 1400 },
    { n: { ar: 'دجاج 1 كغ', en: 'Chicken 1kg' }, q: 1, p: 480 },
    { n: { ar: 'خضر', en: 'Vegetables' }, q: 1, p: 340 },
    { n: { ar: 'باقيت', en: 'Baguette' }, q: 6, p: 15 },
    { n: { ar: 'جبن', en: 'Cheese' }, q: 1, p: 220 }
  ];

  return {
    id: customId,
    mode: 'receipt',
    sampleIdx: 0,
    extracted: {
      merchant,
      member,
      amount,
      cat,
      items,
      day: extractedDay,
      date: extractedDate,
      time: body.time || '6:52 PM',
      autoDest: 'feed'
    }
  };
}

function routeAndPersist(db, parsed) {
  const { mode, extracted, sample } = parsed;

  if (mode === 'receipt') {
    const newPurch = db.addPurchase({
      id: parsed.id || Date.now(),
      member: extracted.member,
      merchant: extracted.merchant,
      cat: extracted.cat,
      amount: extracted.amount,
      day: extracted.day !== undefined ? extracted.day : 10,
      time: extracted.time || '6:52 PM',
      scanned: true,
      items: extracted.items
    });

    const scanCount = db.getConfig('scanCount', 0) + 1;
    db.setConfig('scanCount', scanCount);

    return {
      type: 'receipt',
      action: 'purchases_add',
      targetId: newPurch.id,
      record: newPurch,
      extracted
    };
  }

  // Bill mode:
  // Case A: Current-month variable bill (Sonelgaz electricity/gas or SEAAL water)
  // Automatically update the matching bill's amount in `bills`!
  if (extracted.isCurrentMonth) {
    const existingBills = db.getState().bills;
    const existing = existingBills.find(b => b.id === extracted.targetId);

    let updatedBill;
    if (existing) {
      updatedBill = db.updateBill(existing.id, {
        amount: extracted.amount,
        prevAmount: existing.amount,
        paid: false,
        scanned: true
      });
    } else {
      updatedBill = db.saveBill({
        id: extracted.targetId,
        n: extracted.biller,
        cat: extracted.cat,
        amount: extracted.amount,
        due: extracted.dueDay,
        paid: false,
        kind: extracted.kind,
        scanned: true,
        isScheduled: false
      });
    }

    return {
      type: 'bill',
      action: 'bill_update',
      targetId: updatedBill.id,
      record: updatedBill,
      extracted
    };
  }

  // Case B: Future/car bill (e.g. SAA insurance renewal)
  // Automatically save into `scheduled` and `carItems`!
  const targetId = extracted.targetId || 'ins2';
  const schedBill = db.saveBill({
    id: targetId,
    n: extracted.biller,
    cat: extracted.cat,
    amount: extracted.amount,
    kind: 'fixed',
    scanned: true,
    isScheduled: true,
    dueStr: sample?.dueStr || { ar: 'يستحق 8 ديسمبر', en: 'Due Dec 8' },
    remStr: sample?.remStr || { ar: 'تذكير 1 ديسمبر', en: 'Reminder Dec 1' }
  });

  // Also add or update car item
  const currentCarItems = db.getState().carItems;
  const amtFormatted = Number(extracted.amount).toLocaleString('en-US');
  const existingCarIdx = currentCarItems.findIndex(ci => ci.id === targetId);
  const carItemEntry = {
    id: targetId,
    ico: 'shield',
    c: '#EC4899',
    n: { ar: 'تأمين أكسنت (أم خالد)', en: 'Accent insurance (Umm Khalid)' },
    s: { ar: `8 ديسمبر · ${amtFormatted} د.ج`, en: `Dec 8 · ${amtFormatted} DZD` },
    days: 28,
    ai: false
  };

  if (existingCarIdx >= 0) {
    currentCarItems[existingCarIdx] = carItemEntry;
  } else {
    currentCarItems.splice(1, 0, carItemEntry);
  }
  db.updateCar({ carItems: currentCarItems });

  return {
    type: 'bill',
    action: 'scheduled_and_car_add',
    targetId,
    record: schedBill,
    extracted
  };
}

module.exports = {
  BILL_SAMPLES,
  parseScanRequest,
  parseMultipartBuffer,
  analyzeWithFreeAI,
  routeAndPersist
};
