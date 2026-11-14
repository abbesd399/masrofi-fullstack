/* ============================================================================
 * Masrofi (مصروفي) — Internal System Configuration (Supabase Realtime + Shared Family AI)
 * جميع إعدادات الربط السحابي (Supabase) ومفتاح الذكاء الاصطناعي الموحد للعائلة
 * مدمجة هنا داخلياً في النظام (وفي ملف .env بالسيرفر) دون إظهار أي قوائم إعدادات للمستخدمين.
 * ============================================================================ */
window.M = window.M || {};

M.CONFIG = {
  // 1. Supabase Realtime Family Database (تم ضبطها تلقائياً من حساب Supabase المربوط)
  SUPABASE_URL: 'https://prboebfqsajycvzrzxpz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByYm9lYmZxc2FqeWN2enJ6eHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMjM1OTksImV4cCI6MjEwOTY5OTU5OX0.MA3s9dhRTJSjqGPwQ5JZBrGbkiwHVbYMxIMvxyEWyBo',

  // 2. Shared Family AI Key (مفتاح ذكاء اصطناعي مجاني واحد يعمل تلقائياً مع جميع أفراد العائلة)
  // المزودات المدعومة: 'gemini' (Google AI Studio - gemini-2.5-flash) | 'groq' | 'openrouter'
  AI_PROVIDER: 'gemini',
  AI_MODEL: 'gemini-2.5-flash',
  AI_API_KEY: 'b64:QVEuQWI4Uk42S015Sm9oSU4xNXUzUXhCRW1tSk9rLXRLeFptNWVhNUFmUnVRNzRhTU9BaUE='
};
