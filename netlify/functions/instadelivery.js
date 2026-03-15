const { createClient } = require('@supabase/supabase-js');

const stripJsonComments = (input) => {
  const text = String(input || '');
  let result = '';
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const current = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (current === '\n') {
        inLineComment = false;
        result += current;
      }
      continue;
    }

    if (inBlockComment) {
      if (current === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      result += current;
      if (current === '\\') {
        result += next || '';
        i += 1;
        continue;
      }
      if (current === stringChar) {
        inString = false;
        stringChar = '';
      }
      continue;
    }

    if (current === '"' || current === "'") {
      inString = true;
      stringChar = current;
      result += current;
      continue;
    }

    if (current === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    result += current;
  }

  return result;
};

const sanitizeJson = (input) => {
  const normalizedQuotes = String(input || '')
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  const withoutComments = stripJsonComments(normalizedQuotes);
  return withoutComments.replace(/,\s*([}\]])/g, '$1').trim();
};

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod === 'GET') {
    const storeId = event.queryStringParameters?.store
      ? String(event.queryStringParameters.store)
      : '';
    const since = event.queryStringParameters?.since || '';

    const expectedStoreId = process.env.INSTADELIVERY_STORE_ID
      ? String(process.env.INSTADELIVERY_STORE_ID)
      : '';

    if (expectedStoreId && storeId && expectedStoreId !== storeId) {
      return buildResponse(403, {
        ok: false,
        message: 'store_id nao autorizado.',
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return buildResponse(200, {
        ok: false,
        message: 'Supabase nao configurado.',
        data: [],
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const table = process.env.INSTADELIVERY_TABLE || 'instadelivery_inbox';
    let query = supabase
      .from(table)
      .select('order_id,store_id,status,origem,raw_payload,received_at')
      .order('received_at', { ascending: true })
      .limit(25);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    if (since) {
      query = query.gt('received_at', since);
    }

    const { data, error } = await query;
    if (error) {
      return buildResponse(500, { ok: false, message: error.message, data: [] });
    }

    return buildResponse(200, {
      ok: true,
      data: data || [],
    });
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { ok: false, message: 'Use POST para enviar pedidos.' });
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';
    const cleaned = sanitizeJson(rawBody);
    const payload = JSON.parse(cleaned);

    const storeId = payload.store_id ? String(payload.store_id) : '';
    const expectedStoreId = process.env.INSTADELIVERY_STORE_ID
      ? String(process.env.INSTADELIVERY_STORE_ID)
      : '';
    const warnings = [];

    if (expectedStoreId && storeId && expectedStoreId !== storeId) {
      warnings.push(`store_id divergente (recebido ${storeId}).`);
    }

    let stored = false;
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      const table = process.env.INSTADELIVERY_TABLE || 'instadelivery_inbox';
      const { error } = await supabase.from(table).insert([
        {
          order_id: payload.order_id ?? null,
          store_id: payload.store_id ?? null,
          status: payload.status ?? null,
          origem: payload.origem ?? null,
          raw_payload: payload,
          received_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        warnings.push(`Falha ao gravar no Supabase: ${error.message}`);
      } else {
        stored = true;
      }
    } else {
      warnings.push('Supabase nao configurado (defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).');
    }

    return buildResponse(200, {
      ok: true,
      order_id: payload.order_id ?? null,
      stored,
      warnings,
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    return buildResponse(400, {
      ok: false,
      message: 'JSON invalido ou payload nao processado.',
      error: error.message || 'Falha ao processar payload.',
    });
  }
};
