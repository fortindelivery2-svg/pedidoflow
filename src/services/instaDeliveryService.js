const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);

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

export const sanitizeInstaDeliveryJson = (input) => {
  const normalizedQuotes = String(input || '')
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
  const withoutComments = stripJsonComments(normalizedQuotes);
  return withoutComments.replace(/,\s*([}\]])/g, '$1').trim();
};

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toText = (value) => String(value == null ? '' : value).trim();

export const instaDeliveryStatusMap = [
  { value: 1, label: 'Pedido recebido', internal: 'Novo pedido' },
  { value: 2, label: 'Pedido aceito', internal: 'Em preparação' },
  { value: 3, label: 'Pedido pronto', internal: 'Saiu para entrega' },
  { value: 4, label: 'Pedido cancelado', internal: 'Cancelado' },
];

export const instaDeliveryOrigemMap = {
  1: 'Cardapio',
  2: 'PDV',
  3: 'Mesas',
  10: 'iFood',
  99: 'Pedido teste',
};

export const instaDeliveryPaymentMap = {
  1: 'Dinheiro',
  3: 'Cartao de credito',
  4: 'Cartao de debito',
  10: 'Vale refeicao / alimentacao',
  17: 'PIX',
  42: 'Cartao de credito online',
  43: 'iFood pago',
  47: 'Fiado',
  48: 'Ticket Online',
  99: 'Outras',
};

export const validateInstaDeliveryPayload = (payload) => {
  const errors = [];
  const warnings = [];

  if (!payload || typeof payload !== 'object') {
    return { errors: ['Payload vazio ou invalido.'], warnings };
  }

  const requiredFields = [
    'order_id',
    'status',
    'origem',
    'store_id',
    'nome_destinatario',
    'codigo_item',
    'quantidade_item',
    'descricao_item',
  ];

  requiredFields.forEach((field) => {
    if (payload[field] == null || payload[field] === '') {
      errors.push(`Campo obrigatorio ausente: ${field}.`);
    }
  });

  const items = asArray(payload.codigo_item);
  const quantities = asArray(payload.quantidade_item);
  const descriptions = asArray(payload.descricao_item);

  if (items.length === 0) {
    errors.push('Nenhum item informado em codigo_item.');
  }
  if (quantities.length && items.length && quantities.length !== items.length) {
    warnings.push('quantidade_item tem tamanho diferente de codigo_item.');
  }
  if (descriptions.length && items.length && descriptions.length !== items.length) {
    warnings.push('descricao_item tem tamanho diferente de codigo_item.');
  }

  return { errors, warnings };
};

const buildPaymentLabel = (codes) => {
  const labels = asArray(codes)
    .map((code) => Number(code))
    .map((code) => instaDeliveryPaymentMap[code] || `Codigo ${code}`)
    .filter(Boolean);
  return labels.length ? labels.join(' + ') : 'Nao informado';
};

const findProductMatch = (products, { code, description }) => {
  const normalizedCode = String(code || '').trim();
  const normalizedDesc = toText(description).toLowerCase();
  if (!products?.length) return null;

  if (normalizedCode) {
    const byCodigo = products.find(
      (product) => String(product.codigo || '').trim() === normalizedCode,
    );
    if (byCodigo) return byCodigo;
  }

  if (normalizedCode) {
    const byId = products.find((product) => String(product.id) === normalizedCode);
    if (byId) return byId;
  }

  if (normalizedDesc) {
    const byDesc = products.find(
      (product) => toText(product.descricao).toLowerCase() === normalizedDesc,
    );
    if (byDesc) return byDesc;
  }

  return null;
};

export const mapInstaDeliveryPayload = (payload, products = []) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload do InstaDelivery invalido.');
  }

  const warnings = [];
  const codigoItem = asArray(payload.codigo_item);
  const codigoExternoItem = asArray(payload.codigo_externo_item);
  const quantidadeItem = asArray(payload.quantidade_item);
  const valorUnitarioItem = asArray(payload.valor_unitario_item);
  const valorTotalItem = asArray(payload.valor_total_item);
  const descricaoItem = asArray(payload.descricao_item);
  const grupoItem = asArray(payload.grupo_item);

  const maxLength = Math.max(
    codigoItem.length,
    quantidadeItem.length,
    valorUnitarioItem.length,
    valorTotalItem.length,
    descricaoItem.length,
    grupoItem.length,
    0,
  );

  const effectiveLength = maxLength || codigoExternoItem.length;
  const items = Array.from({ length: effectiveLength }).map((_, index) => {
    const code = codigoExternoItem[index] ?? codigoItem[index] ?? index + 1;
    const description = descricaoItem[index] || `Item ${index + 1}`;
    const matched = findProductMatch(products, { code, description });
    const quantity = toNumber(quantidadeItem[index] ?? 1) || 1;
    const unitValue = toNumber(valorUnitarioItem[index]);
    const totalValue = toNumber(valorTotalItem[index]);
    const price = unitValue || (quantity ? totalValue / quantity : 0);

    if (!matched) {
      warnings.push(`Produto nao encontrado no ERP: ${description} (codigo ${code}).`);
    }

    return {
      id: matched?.id || `insta-${code}`,
      produto: matched?.descricao || toText(description) || `Item ${index + 1}`,
      categoria: matched?.categoria || toText(grupoItem[index]) || 'InstaDelivery',
      quantidade: quantity,
      preco_unitario: price,
    };
  });

  if (!items.length) {
    throw new Error('Nao foi possivel identificar itens no pedido.');
  }

  const statusCode = Number(payload.status || 1);
  const statusMap = instaDeliveryStatusMap.find((item) => item.value === statusCode);
  const origemCode = Number(payload.origem || 1);

  const clienteNome = toText(payload.nome_destinatario) || 'Cliente InstaDelivery';
  const telefone = toText(payload.telefone_destinatario);
  const bairro = toText(payload.bairro_destinatario);
  const enderecoParts = [
    toText(payload.logradouro_destinatario),
    payload.numero_destinatario ? `Numero ${payload.numero_destinatario}` : '',
    toText(payload.complemento_destinatario),
  ].filter(Boolean);
  const endereco = enderecoParts.join(', ');

  const desconto = toNumber(payload.valor_desconto);
  const acrescimo = toNumber(payload.valor_acrescimo);
  const taxaEntrega = toNumber(payload.valor_taxa);
  const itensTotal = items.reduce(
    (sum, item) => sum + Number(item.preco_unitario || 0) * Number(item.quantidade || 0),
    0,
  );
  const totalFromPayload = toNumber(payload.valor_venda);
  const total =
    totalFromPayload || Math.max(0, itensTotal + taxaEntrega - desconto + acrescimo);

  const needsTroco = toNumber(payload.valor_troco) > 0;
  const trocoPara = needsTroco ? total + toNumber(payload.valor_troco) : 0;

  const observacoes = [
    toText(payload.observacoes_venda),
    toText(payload.referencia) ? `Referencia: ${toText(payload.referencia)}` : '',
    toText(payload.agendamento) ? `Agendamento: ${toText(payload.agendamento)}` : '',
    payload.order_id ? `InstaDelivery order_id: ${payload.order_id}` : '',
    payload.codigo_parceiro ? `Codigo parceiro: ${payload.codigo_parceiro}` : '',
    origemCode ? `Origem: ${instaDeliveryOrigemMap[origemCode] || origemCode}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const payloadForOrder = {
    origem: 'instadelivery',
    external_id: payload.order_id,
    external_source: 'instadelivery',
    persistClient: true,
    cliente: {
      nome: clienteNome,
      telefone,
      endereco,
      bairro,
    },
    itens: items,
    forma_pagamento: buildPaymentLabel(payload.forma_pagamento),
    valor_total: total,
    taxa_entrega: taxaEntrega,
    endereco,
    bairro,
    data: payload.data_venda,
    observacoes,
    precisa_troco: needsTroco,
    troco_para: trocoPara,
  };

  return {
    payload: payloadForOrder,
    status: statusMap?.internal || 'Novo pedido',
    warnings,
  };
};
