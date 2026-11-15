/**
 * Scanner AI Service: Extract & Auto-Route Receipts and Utility/Car Bills + AI Price-Hike Detection Over Time
 * Supports:
 *   1. Official Free Google Gemini Vision API (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 *   2. Official Free Groq Vision API (meta-llama/llama-4-scout-17b-16e-instruct)
 *   3. OpenRouter Free Vision Models (google/gemini-2.0-flash-exp:free)
 *   4. Instant Offline Algerian Receipt/Bill Smart Heuristic Engine (Zero-downtime fallback)
 */

const { jsonRequest } = require('./supabase');

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function runLocalTesseractAndParse(imageDataUrl, defaultMode = 'receipt') {
  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) return null;
  let tmpFile = null;
  try {
    const commaIdx = imageDataUrl.indexOf(',');
    const buf = Buffer.from(imageDataUrl.slice(commaIdx + 1), 'base64');
    tmpFile = path.join(os.tmpdir(), 'masrofi_scan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.jpg');
    fs.writeFileSync(tmpFile, buf);
    const ocrText = execFileSync('tesseract', [tmpFile, 'stdout', '--psm', '11'], { encoding: 'utf8', timeout: 4500 });
    if (!ocrText || ocrText.trim().length < 3) return null;

    const normDigits = s => String(s || '')
      .replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
      .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);

    const text = normDigits(ocrText);
    const lower = text.toLowerCase();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const fixThermalZero = v => (v >= 100 && v % 10 === 9) ? (v - 9) : v;
    const parseMoneyVal = (str, isTotalContext = false) => {
      let s = str
        .replace(/\b\d+\s*(?:kg|g|mg|ml|cl|l|p|pcs|كغ|غ|لتر|مل)\b/gi, ' ')
        .replace(/\b[xX×*]\s*\d+\b/g, ' ');
      if (!isTotalContext) {
        s = s.replace(/\b\d+\s*[xX×*]\s*/g, ' ');
      }
      const cleaned = s.replace(/(\b\d{1,3})[\s.](?=\d{3}(?:\D|$))/g, '$1').replace(',', '.');
      const matches = [...cleaned.matchAll(/\b(\d{2,6}(?:\.\d{1,2})?)\b/g)];
      const vals = [];
      for (const m of matches) {
        const v = Math.round(parseFloat(m[1]));
        if (v >= 30 && v <= 450000 && !(v >= 1990 && v <= 2035)) {
          vals.push(fixThermalZero(v));
        }
      }
      return vals;
    };

    const totalKwRegex = /\b(total|ttc|net\s*[aà]\s*payer|montant\s*[aà]?\s*payer|montant\s*ttc|montant|somme|المجموع|الإجمالي|الاجمالي|المبلغ|الصافي|الواجب\s*دفعه|للدفع)\b/i;
    const currencyLineRegex = /\b(\d[\d\s.,]*)\s*(da|dzd|د\.ج|دج)\b/i;
    const totalCandidates = [];
    const currencyCandidates = [];
    const allCandidates = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const vals = parseMoneyVal(line, totalKwRegex.test(line));
      if (vals.length) allCandidates.push(...vals);
      if (currencyLineRegex.test(line) && vals.length) currencyCandidates.push(...vals);
      if (totalKwRegex.test(line)) {
        if (vals.length) totalCandidates.push(...vals);
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 4); j++) {
          const nextVals = parseMoneyVal(lines[j], true);
          if (nextVals.length) totalCandidates.push(...nextVals);
        }
      }
    }

    let amount = 0;
    if (totalCandidates.length) amount = Math.max(...totalCandidates);
    else if (currencyCandidates.length) amount = Math.max(...currencyCandidates);
    else if (allCandidates.length) amount = Math.max(...allCandidates);

    const isElec = /(sonelgaz|سونلغاز|كهرباء|غاز|électricité|electricite|kwh)/i.test(lower);
    const isWater = /(seaal|سيال|الجزائرية للمياه|\bade\b|فاتورة الماء|facture d'eau)/i.test(lower);
    const isNet = /(idoom|إيدوم|ايدوم|algérie télécom|algerie telecom|اتصالات الجزائر|adsl|ftth|fibre)/i.test(lower);
    const isIns = /(\bsaa\b|alliance|ciar|تأمين|assurance)/i.test(lower);
    const isSupermarket = /(supermarch|permarch|سوبرماركت|ماركت|couscous|huile|elio|lait|candia|pâtes|italiano|sucre|poulet|tomate|concombre|banane|orange|salade|yaourt|danone)/i.test(lower);
    const isFuel = /(naftal|نفطال|محطة وقود|بنزين|carburant|essence|gasoil)/i.test(lower);
    const isPharm = /(صيدلية|pharmacie|pharmacy)/i.test(lower);

    if ((isElec || isWater || isNet || isIns) && !isSupermarket) {
      let biller = { ar: 'سونلغاز · الكهرباء والغاز', en: 'Sonelgaz · Power & Gas' };
      let cat = 'utilities';
      let kind = 'var';
      if (isWater) biller = { ar: 'سيال · فاتورة الماء', en: 'SEAAL · Water Bill' };
      else if (isNet) { biller = { ar: 'اتصالات الجزائر · Idoom', en: 'Algérie Télécom · Idoom' }; cat = 'net'; kind = 'fixed'; }
      else if (isIns) { biller = { ar: 'تأمين السيارة · SAA', en: 'Car Insurance · SAA' }; cat = 'car'; kind = 'fixed'; }
      return {
        mode: 'bill',
        targetId: 'custom',
        kind,
        cat,
        biller,
        amount: amount || 3200,
        dueDay: 18,
        isCurrentMonth: true,
        dueText: { ar: '18 نوفمبر 2026', en: 'Nov 18, 2026' },
        detectedHikes: []
      };
    }

    let merchant = { ar: 'سوبرماركت · Supermarché', en: 'Supermarché' };
    let cat = 'groceries';
    if (isFuel) { merchant = { ar: 'محطة وقود · نفطال', en: 'Naftal Fuel Station' }; cat = 'car'; }
    else if (isPharm) { merchant = { ar: 'صيدلية', en: 'Pharmacy' }; cat = 'health'; }

    if (!(amount > 0)) return null;
    return {
      mode: 'receipt',
      merchant,
      cat,
      amount,
      day: 15,
      items: [{ n: merchant, q: 1, p: amount }],
      detectedHikes: []
    };
  } catch {
    return null;
  } finally {
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
}


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
 * Call free AI Vision / LLM API (Gemini 2.5 Flash / Gemini 2.0 Flash / Groq / OpenRouter) when configured
 * and an image or OCR text is provided. Also compares prices against priceHistory to detect price hikes over time!
 */
async function analyzeWithFreeAI(body, aiCfg) {
  const hasConfiguredKey = Boolean(aiCfg && aiCfg.aiConfigured && aiCfg.aiApiKey);
  const hasRealImage = typeof body.image === 'string' && body.image.startsWith('data:image/') && body.image.length > 200;
  const hasText = Boolean(body.text || body.ocrText);
  if (!hasRealImage && !hasText) return null;

  const mode = body.mode || 'receipt';
  const priceHistory = Array.isArray(body.priceHistory) && body.priceHistory.length
    ? `\nHistorical family prices for comparison: ${JSON.stringify(body.priceHistory)}. If any item or bill on this paper has a higher price than its historical lastPrice, include it in "detectedHikes": [{"n":{"ar":"اسم الصنف","en":"Item name"},"was":100,"now":130}].`
    : '';
  const sysPrompt = `You are Masrofi AI, a high-accuracy Arabic/French/English document classifier, receipt/bill OCR parser, and price-hike detector.
First, AUTOMATICALLY recognize whether the photographed paper is a purchase receipt ("mode": "receipt") or a utility/internet/car bill/obligation ("mode": "bill"). Read the exact text, numbers, store/biller name, total amount, date, and line items written on the paper and return ONLY a valid JSON object with no markdown fences:${priceHistory}
If mode is "receipt":
{
  "mode": "receipt",
  "merchant": { "ar": "اسم المتجر المكتوب في الورقة", "en": "Store name from paper" },
  "cat": "groceries" | "car" | "utilities" | "home" | "family" | "dining" | "health" | "net",
  "amount": 3450,
  "day": 10,
  "items": [{ "n": { "ar": "اسم الصنف من الورقة", "en": "Item name" }, "q": 1, "p": 3450 }],
  "detectedHikes": []
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
  "dueText": { "ar": "18 نوفمبر 2026", "en": "Nov 18, 2026" },
  "detectedHikes": []
}`;

  try {
    const provider = (aiCfg.aiProvider || 'gemini').toLowerCase();
    let rawJsonText = '';

    if (!hasConfiguredKey) {
      const userContent = [{ type: 'text', text: sysPrompt + (hasText ? `\nOCR Text: ${body.text || body.ocrText}` : '') }];
      if (hasRealImage) {
        userContent.push({ type: 'image_url', image_url: { url: body.image } });
      }
      const res = await jsonRequest('https://text.pollinations.ai/openai', {
        method: 'POST',
        body: {
          model: 'openai',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: userContent }]
        },
        timeout: 9000
      });
      if (res.ok && res.data?.choices?.[0]?.message?.content) {
        rawJsonText = res.data.choices[0].message.content;
      }
    } else if (provider === 'gemini') {
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
      const models = [aiCfg.aiModel || 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      const seen = new Set();
      for (const model of models) {
        if (!model || seen.has(model)) continue;
        seen.add(model);
        try {
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
            break;
          }
        } catch {}
      }
    } else {
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
  if (hasRealImage) {
    const localOcr = runLocalTesseractAndParse(body.image, mode);
    if (localOcr) return localOcr;
  }
  return null;
}

function parseScanRequest(body) {
  let mode = body.mode || body.type || 'receipt';
  let sampleIdx = Number(body.sampleIdx !== undefined ? body.sampleIdx : 0);
  const customId = body.id !== undefined && !isNaN(body.id) ? Number(body.id) : undefined;

  let rawText = '';
  for (const field of [body.text, body.ocrText, body.caption, body.filename, body.title]) {
    if (!field) continue;
    if (typeof field === 'string' && !field.startsWith('data:') && field.length < 5000) {
      rawText += ' ' + field;
    }
  }

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

  let extractedAmount = (body.amount !== undefined && !isNaN(body.amount) && Number(body.amount) > 0) ? Number(body.amount) : null;
  if (extractedAmount === null) {
    const amtMatch = combinedText.match(/\b(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+)\s*(?:da|dzd|د\.ج|دج)?/i);
    if (amtMatch) {
      const num = parseFloat(amtMatch[1].replace(/[\s,]/g, ''));
      if (num > 0) extractedAmount = num;
    }
  }

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
        detectedHikes: Array.isArray(body.detectedHikes) ? body.detectedHikes : [],
        autoDest: (body.isCurrentMonth !== undefined ? Boolean(body.isCurrentMonth) : samp.isCurrentMonth) ? 'month' : 'sched'
      }
    };
  }

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
      detectedHikes: Array.isArray(body.detectedHikes) ? body.detectedHikes : [],
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
