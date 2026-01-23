'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { readStoredSiteInfo } from '@/utils/connector.mjs';
import { MODELS, findModelByProviderModel, getModelValue, PROVIDERS } from '@/app/agentic/settings/personalized/modelCatalog.mjs';

const CHAT_API_URL = process.env.REACT_APP_CHAT_API_URL || 'http://localhost:4000';

const ASSISTANT_AI_SYSTEM_INSTRUCTIONS = [
  'You are the product editor assistant.',
  'Follow the commands the UI supports and respond concisely.',
  'When asked to write or generate a field, respond using the open-tag format <field>value<field>.',
  'Always use open-tag format for updates: <field>value<field> (e.g., <price>5000<price>).',
  'Do not use spaces in tag names; use underscores (short_description, regular_price, sale_price, stock_quantity, size_guide).',
  'Use product_name for the title field (not name).',
  'Only use these fields: Product Name, Name, Short Description, Description, Tags, Categories, Brands, Price, Regular Price, Sale Price, Discount Price, SKU, Stock Quantity, Variations, Variation Attributes, Variants, Status, Size Guide, Attributes.',
  'Allowed tags: product_name, short_description, description, price, regular_price, sale_price, discount_price, sku, stock_quantity, status, categories, tags, size_guide, variations, variation_attributes, variants, attributes.',
  'Avoid instructional text in update replies.',
  'Strict mode: only follow these instructions and do not invent categories, tags, or attributes.',
  'Supported commands: name, price, regular price, sale/discount price, short description, description, sku, stock quantity.',
  'Categories and tags can be set by name.',
  'Use only names/slugs from the provided lists when setting categories, tags, or attributes.',
  'You must only use the attributes listed.',
  'You must only use the tags listed based on user intent or product specifications.',
  'Enable variations on/off and create variants only from the available attribute terms.',
  'Variations must use attribute names and term values from the provided list; do not invent.',
  'Size guide can be selected by name.',
  'Status supports draft/publish (live). Draft should return preview URL.',
  'When asked for demo product data or a sample, respond in plain text (no markdown) and avoid fixed template phrasing.',
].join(' ');

const normalizeToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const findAttributeByKey = (key, sources) => {
  const normalizedKey = normalizeToken(key);
  if (!normalizedKey) return null;
  return sources.find((attribute) => {
    const name = attribute?.label || attribute?.name || '';
    const taxonomy = attribute?.taxonomy || '';
    return normalizeToken(name) === normalizedKey || normalizeToken(taxonomy) === normalizedKey;
  }) || null;
};

const parseAiTokens = (value) =>
  String(value || '')
    .split(/,|\band\b/i)
    .map((item) => item.trim())
    .filter(Boolean);

const parseVariationLine = (line, attributeSources, toSlug) => {
  const cleaned = String(line || '')
    .replace(/^[\s•*-]+/, '')
    .trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(',').map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) return null;
  const attributes = {};
  const attributeTerms = {};
  tokens.forEach((token) => {
    const match = token.match(/^(.+?)\s*[-:]\s*(.+)$/);
    if (!match) return;
    const label = match[1].trim();
    const value = match[2].trim();
    const attribute = findAttributeByKey(label, attributeSources);
    if (!attribute || !value) return;
    const key = attribute.taxonomy || attribute.name || attribute.label;
    const terms = Array.isArray(attribute.terms) ? attribute.terms : [];
    const normalizedValue = normalizeToken(value);
    const matchedTerm = terms.find((term) => {
      const termName = term?.name || term?.label || '';
      const termSlug = term?.slug || toSlug(termName);
      return normalizeToken(termName) === normalizedValue || normalizeToken(termSlug) === normalizedValue;
    });
    if (!matchedTerm) return;
    const optionSlug = matchedTerm.slug || toSlug(matchedTerm.name || value);
    attributes[key] = optionSlug;
    attributeTerms[key] = [
      ...(attributeTerms[key] || []),
      matchedTerm.name || value,
    ];
  });
  if (!Object.keys(attributes).length) return null;
  return { attributes, attributeTerms };
};

const parseNumericValue = (value) => {
  const match = String(value || '').match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : '';
};

const extractListLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/\(id:\s*\d+\)/gi, '')
    .replace(/\(.*?\b\d+\b.*?\)/g, '')
    .replace(/\bid:\s*\d+/gi, '')
    .trim();
};

const extractIdFromLabel = (value) => {
  const raw = String(value || '');
  const match = raw.match(/\b(?:id[:\s]*|#)(\d+)\b/i)
    || raw.match(/\((?:\s*id[:\s]*)?(\d+)\s*\)/i);
  return match ? match[1] : '';
};

const parseAiList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const findClosestCatalogMatch = (value, catalog = []) => {
  const needle = normalizeToken(value);
  if (!needle) return null;
  let best = null;
  let bestScore = 0;
  catalog.forEach((item) => {
    const name = item?.name || '';
    const normalized = normalizeToken(name);
    if (!normalized) return;
    let score = 0;
    if (normalized === needle) score = 3;
    else if (normalized.startsWith(needle) || needle.startsWith(normalized)) score = 2;
    else if (normalized.includes(needle) || needle.includes(normalized)) score = 1;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  });
  return bestScore > 0 ? best : null;
};

const mapNamesToIds = (values, catalog = []) =>
  values.map((value) => {
    if (typeof value === 'number') return value;
    const raw = String(value).trim();
    const extractedId = extractIdFromLabel(raw);
    if (extractedId) {
      const parsedId = Number(extractedId);
      return Number.isFinite(parsedId) ? parsedId : extractedId;
    }
    const cleaned = extractListLabel(raw);
    const match = catalog.find((item) => {
      const id = item?.id;
      const name = item?.name;
      const slug = item?.slug;
      return (
        String(id) === cleaned ||
        String(name || '').toLowerCase() === cleaned.toLowerCase() ||
        String(slug || '').toLowerCase() === cleaned.toLowerCase()
      );
    });
    if (match) {
      return match?.id || match?.name || cleaned;
    }
    const closest = findClosestCatalogMatch(cleaned, catalog);
    return closest?.id || closest?.name || cleaned;
  });

const buildCatalogContext = (label, items) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const names = items
    .map((item) => item?.name || item?.title || item?.label || '')
    .filter(Boolean);
  if (!names.length) return '';
  return `${label}: ${names.join(', ')}`;
};

const buildCatalogJsonContext = (label, items, mapItem) => {
  if (!Array.isArray(items) || items.length === 0) return '';
  const payload = items.map((item) => mapItem(item)).filter(Boolean);
  if (!payload.length) return '';
  return `${label}: ${JSON.stringify(payload)}`;
};

const stripMarkdown = (value) =>
  String(value || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|\s)\*(\S)/g, '$1$2')
    .replace(/(^|\s)_(\S)/g, '$1$2');

const FIELD_LABELS = [
  'Product Name',
  'Name',
  'Short Description',
  'Description',
  'Tags',
  'Categories',
  'Brands',
  'Price',
  'Regular Price',
  'Sale Price',
  'Discount Price',
  'SKU',
  'Stock Quantity',
  'Variations',
  'Variation Attributes',
  'Variants',
  'Status',
  'Size Guide',
  'Attributes',
];

const formatAssistantReply = (value) => {
  const cleaned = stripMarkdown(value).trim();
  if (!cleaned) return '';
  let formatted = cleaned;
  FIELD_LABELS.forEach((label) => {
    const pattern = label.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${pattern}\\s*:`, 'gi');
    formatted = formatted.replace(regex, `\n${label}:`);
  });
  formatted = formatted.replace(/\n{2,}/g, '\n').replace(/^\n/, '');
  return formatted;
};

const formatTagLabel = (value) => {
  const key = String(value || '').trim().toLowerCase();
  const labelMap = {
    product_name: 'Product name',
    name: 'Product name',
    title: 'Product name',
    short_description: 'Short description',
    description: 'Description',
    price: 'Price',
    regular_price: 'Regular price',
    sale_price: 'Sale price',
    sku: 'SKU',
    stock_quantity: 'Stock quantity',
    status: 'Status',
    categories: 'Categories',
    tags: 'Tags',
    size_guide: 'Size guide',
  };
  return labelMap[key] || key.replace(/_/g, ' ');
};

const formatAttributeLabel = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Attribute';
  const cleaned = raw.replace(/^pa[_-]/i, '').replace(/_/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
};

function AssistantAI({
  form,
  setForm,
  previewSlug,
  previewUrl,
  liveUrl,
  product,
  savedProduct,
  selectedCategories,
  setSelectedCategories,
  availableCategories,
  selectedTags,
  setSelectedTags,
  availableTags,
  sizeGuides,
  setSizeGuideEnabled,
  setSelectedSizeGuideId,
  setVariationEnabled,
  selectedAttributes,
  setSelectedAttributes,
  availableAttributes,
  setVariations,
  toSlug,
  buildProductUrl,
  onRequestAutoGenerate,
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [aiStatusLine, setAiStatusLine] = useState('Thinking');
  const [selectedModel, setSelectedModel] = useState({ type: 'auto' });
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelOptions = useMemo(() => MODELS.filter((model) => model.type !== 'image'), []);
  const providerLabelMap = useMemo(() => {
    const map = new Map();
    PROVIDERS.forEach((provider) => {
      map.set(provider.id, provider.label);
    });
    return map;
  }, []);
  const getProviderLabel = useCallback(
    (providerId) => providerLabelMap.get(providerId) || providerId || 'Auto',
    [providerLabelMap]
  );
  const siteInfo = readStoredSiteInfo();
  const siteLogo = siteInfo?.logoUrl || siteInfo?.site_logo_url || '';

  useEffect(() => {
    const authToken = localStorage.getItem('agentic_auth_token');
    if (!authToken) {
      setSelectedModel({ type: 'auto' });
      return;
    }
    setIsModelLoading(true);
    fetch(`${CHAT_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load model settings.');
        }
        const settings = payload?.settings || {};
        if (!settings.provider || !settings.model) {
          setSelectedModel({ type: 'auto' });
          return;
        }
        if (settings.provider === 'auto') {
          setSelectedModel({ type: 'auto' });
          return;
        }
        if (settings.provider === 'cloudflare' && settings.model === 'workersai/auto') {
          setSelectedModel({ type: 'auto' });
          return;
        }
        const matched = findModelByProviderModel(settings.provider, settings.model, modelOptions);
        if (matched) {
          setSelectedModel({ type: 'model', ...matched });
          return;
        }
        setSelectedModel({
          type: 'model',
          id: `${settings.provider}/${settings.model}`,
          label: 'Custom model',
          provider: settings.provider,
          context: settings.model,
          isCustom: true,
        });
      })
      .catch(() => {
        setSelectedModel({ type: 'auto' });
      })
      .finally(() => {
        setIsModelLoading(false);
      });
  }, [modelOptions]);

  useEffect(() => {
    if (!historyOpen) return;
    const authToken = localStorage.getItem('agentic_auth_token');
    if (!authToken) {
      setHistorySessions([]);
      return;
    }
    setHistoryLoading(true);
    fetch(`${CHAT_API_URL}/sessions?context=woocommerce`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load sessions.');
        }
        const sessions = Array.isArray(payload?.sessions)
          ? payload.sessions
          : Array.isArray(payload)
            ? payload
            : [];
        const ordered = [...sessions].sort((a, b) => {
          const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
          const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
          return bTime - aTime;
        });
        setHistorySessions(ordered.slice(0, 6));
      })
      .catch(() => {
        setHistorySessions([]);
      })
      .finally(() => {
        setHistoryLoading(false);
      });
  }, [historyOpen]);

  const handleHistorySelect = useCallback(async (sessionId) => {
    const authToken = localStorage.getItem('agentic_auth_token');
    if (!authToken) {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sign in to view past conversations.' },
      ]);
      return;
    }
    setHistoryLoading(true);
    try {
      const response = await fetch(`${CHAT_API_URL}/sessions/${sessionId}/messages?context=woocommerce`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load conversation.');
      }
      const mapped = (payload?.messages || [])
        .map((message) => ({
          role: message.role,
          content: message.content,
        }))
        .filter((message) => message.role && message.content);
      setAiMessages(mapped);
      setHistoryOpen(false);
    } catch (error) {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: error?.message || 'Failed to load conversation.' },
      ]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const switchToAutoModel = useCallback(async () => {
    setSelectedModel({ type: 'auto' });
    const authToken = localStorage.getItem('agentic_auth_token');
    if (!authToken) return;
    try {
      await fetch(`${CHAT_API_URL}/settings/provider`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ provider: 'auto', model: 'auto' }),
      });
    } catch (_error) {
      // ignore
    }
  }, []);

  const handleModelChange = useCallback(async (nextValue) => {
    const authToken = localStorage.getItem('agentic_auth_token');
    if (nextValue === 'auto') {
      setSelectedModel({ type: 'auto' });
      setModelMenuOpen(false);
      if (!authToken) return;
      try {
        await fetch(`${CHAT_API_URL}/settings/provider`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ provider: 'auto', model: 'auto' }),
        });
      } catch (_error) {
        // ignore
      }
      return;
    }
    const nextModel = modelOptions.find((model) => model.id === nextValue);
    if (!nextModel) return;
    setSelectedModel({ type: 'model', ...nextModel });
    setModelMenuOpen(false);
    if (!authToken) return;
    try {
      const modelValue = getModelValue(nextModel);
      await fetch(`${CHAT_API_URL}/settings/provider`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ provider: nextModel.provider, model: modelValue }),
      });
    } catch (_error) {
      // ignore
    }
  }, [modelOptions]);

  const allowedLabelSet = useMemo(
    () => new Set(FIELD_LABELS.map((label) => label.toLowerCase())),
    []
  );

  const getTaggedDisplayRows = useCallback((value) => {
    const results = [];
    const seen = new Set();
    const pushRow = (key, rawValue) => {
      const normalizedKey = String(key || '').trim();
      const label = formatTagLabel(normalizedKey);
      if (!allowedLabelSet.has(label.toLowerCase())) return;
      const cleaned = String(rawValue || '').replace(/<\/?[^>]+>/g, '').trim();
      if (!label || !cleaned) return;
      const signature = `${label}:${cleaned}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      results.push({ label, value: cleaned });
    };
    const text = String(value || '');
    const fullTagRegex = /<([A-Za-z0-9 _-]+)>([\s\S]*?)<\/\1>/g;
    let match = null;
    while ((match = fullTagRegex.exec(text))) {
      pushRow(match[1], match[2]);
    }
    const openTagRegex = /<([A-Za-z0-9 _-]+)>([^<\n]+?)<\1>/g;
    while ((match = openTagRegex.exec(text))) {
      pushRow(match[1], match[2]);
    }
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    lines.forEach((line) => {
      const labelMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (labelMatch) {
        const rawLabel = labelMatch[1].replace(/^product\s+/i, '').trim();
        pushRow(rawLabel, labelMatch[2]);
      }
      const selectMatch = line.match(/<select\s+[^>]*name\s*=\s*["']?([^"'\s>]+)["']?[^>]*value\s*=\s*["']?([^"']+)["']?[^>]*>/i);
      if (selectMatch) {
        const label = `Attribute: ${formatAttributeLabel(selectMatch[1])}`;
        pushRow(label, selectMatch[2]);
      }
      const openLeadMatch = line.match(/^<\s*([A-Za-z0-9 _-]+)\s*>\s*(.+)$/);
      if (openLeadMatch) {
        pushRow(openLeadMatch[1], openLeadMatch[2]);
      }
      const closingMatch = line.match(/^(.*)<\/\s*([A-Za-z0-9 _-]+)\s*>$/);
      if (closingMatch) {
        pushRow(closingMatch[2], closingMatch[1]);
      }
      const openTailMatch = line.match(/^(.*)<\s*([A-Za-z0-9 _-]+)\s*>$/);
      if (openTailMatch) {
        pushRow(openTailMatch[2], openTailMatch[1]);
      }
    });
    return results;
  }, [allowedLabelSet]);

  const parseAiInput = (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return { error: 'Type a request first.' };
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const payload = JSON.parse(trimmed);
        return { payload };
      } catch (_error) {
        return { error: 'Invalid JSON. Fix it or use simple "field: value" lines.' };
      }
    }
    const payload = {};
    const warnings = [];
    const attributeSources = [...selectedAttributes, ...availableAttributes];
    const lines = trimmed.split(/\n|;/).map((line) => line.trim()).filter(Boolean);
    const tagMap = {
      title: 'name',
      name: 'name',
      productname: 'name',
      product_name: 'name',
      shortdescription: 'short_description',
      shortdesc: 'short_description',
      description: 'description',
      price: 'price',
      regularprice: 'regular_price',
      saleprice: 'sale_price',
      discountprice: 'sale_price',
      sku: 'sku',
      stockquantity: 'stock_quantity',
      quantity: 'stock_quantity',
      status: 'status',
      categories: 'categories',
      tags: 'tags',
      sizeguide: 'size_guide',
      variations: 'variations',
    };
    const extractTaggedFields = (value) => {
      const results = [];
      const sanitizeTagValue = (raw) =>
        String(raw || '')
          .replace(/<\/?[^>]+>/g, '')
          .trim();
      const regex = /<([A-Za-z0-9 _-]+)>([\s\S]*?)<\/\1>/g;
      let match = null;
      while ((match = regex.exec(value))) {
        const key = normalizeToken(match[1]);
        const field = tagMap[key];
        if (!field) continue;
        const rawValue = sanitizeTagValue(match[2]);
        if (!rawValue) continue;
        results.push({ field, value: rawValue });
      }
      const openTagRegex = /<([A-Za-z0-9 _-]+)>([^<]+?)<\1>/g;
      while ((match = openTagRegex.exec(value))) {
        const key = normalizeToken(match[1]);
        const field = tagMap[key];
        if (!field) continue;
        const rawValue = sanitizeTagValue(match[2]);
        if (!rawValue) continue;
        results.push({ field, value: rawValue });
      }
      const linesWithClosers = String(value || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      linesWithClosers.forEach((line) => {
        if (line.includes('<') && line.includes('>')) {
          const closingMatch = line.match(/^(.*)<\/\s*([A-Za-z0-9 _-]+)\s*>$/);
          if (closingMatch) {
            const rawValue = sanitizeTagValue(closingMatch[1]);
            const key = normalizeToken(closingMatch[2]);
            const field = tagMap[key];
            if (field && rawValue) {
              results.push({ field, value: rawValue });
            }
          }
          const openTailMatch = line.match(/^(.*)<\s*([A-Za-z0-9 _-]+)\s*>$/);
          if (openTailMatch) {
            const rawValue = sanitizeTagValue(openTailMatch[1]);
            const key = normalizeToken(openTailMatch[2]);
            const field = tagMap[key];
            if (field && rawValue) {
              results.push({ field, value: rawValue });
            }
          }
          const openLeadMatch = line.match(/^<\s*([A-Za-z0-9 _-]+)\s*>\s*(.+)$/);
          if (openLeadMatch) {
            const key = normalizeToken(openLeadMatch[1]);
            const field = tagMap[key];
            const rawValue = sanitizeTagValue(openLeadMatch[2]);
            if (field && rawValue) {
              results.push({ field, value: rawValue });
            }
          }
        }
      });
      return results;
    };
    const stripAngleTags = (value) =>
      String(value || '')
        .replace(/<\/?[^>]+>/g, '')
        .trim();
    const matchLine = (line, label) => {
      const regex = new RegExp(`\\b(?:${label})\\b\\s*(?:to|=|:|>)\\s*([^\\n;]+)`, 'i');
      const match = line.match(regex);
      if (!match || typeof match[1] !== 'string') return null;
      const cleaned = stripAngleTags(match[1]);
      return cleaned || null;
    };
    const isInstructionalLine = (line) => {
      const lowered = line.toLowerCase();
      return (
        lowered.includes('there is no') ||
        lowered.includes('enter the') ||
        lowered.includes('do you want') ||
        lowered.includes('would you like') ||
        lowered.includes('i can') ||
        lowered.includes('i could')
      );
    };

    const tagged = extractTaggedFields(trimmed);
    if (tagged.length) {
      tagged.forEach(({ field, value }) => {
        if (field === 'price') {
          payload.price = parseNumericValue(value);
        } else if (field === 'regular_price') {
          payload.regular_price = parseNumericValue(value);
        } else if (field === 'sale_price') {
          payload.sale_price = parseNumericValue(value);
        } else if (field === 'stock_quantity') {
          payload.stock_quantity = parseNumericValue(value);
        } else if (field === 'categories') {
          payload.categories = parseAiList(value);
        } else if (field === 'tags') {
          payload.tags = parseAiList(value);
        } else {
          payload[field] = value;
        }
      });
    }

    const selectRegex = /<select\s+[^>]*name\s*=\s*["']?([^"'\s>]+)["']?[^>]*value\s*=\s*["']?([^"']+)["']?[^>]*>/i;
    const selectMatches = lines
      .map((line) => line.match(selectRegex))
      .filter(Boolean);
    if (selectMatches.length) {
      const variations = [];
      let current = {};
      selectMatches.forEach((match) => {
        const rawKey = match[1];
        const rawValue = match[2];
        const attribute = findAttributeByKey(rawKey, attributeSources);
        if (!attribute) return;
        const key = attribute.taxonomy || attribute.name || attribute.label;
        const terms = Array.isArray(attribute.terms) ? attribute.terms : [];
        const normalizedValue = normalizeToken(rawValue);
        const matchedTerm = terms.find((term) => {
          const termName = term?.name || term?.label || '';
          const termSlug = term?.slug || toSlug(termName);
          return normalizeToken(termName) === normalizedValue || normalizeToken(termSlug) === normalizedValue;
        });
        if (!matchedTerm) return;
        if (current[key]) {
          variations.push(current);
          current = {};
        }
        current[key] = matchedTerm.slug || toSlug(matchedTerm.name || rawValue);
        payload.attribute_terms = payload.attribute_terms || {};
        payload.attribute_terms[key] = [
          ...(payload.attribute_terms[key] || []),
          matchedTerm.name || rawValue,
        ];
      });
      if (Object.keys(current).length) {
        variations.push(current);
      }
      if (variations.length) {
        payload.variations_from_terms = [
          ...(payload.variations_from_terms || []),
          ...variations,
        ];
      }
    }

    let inVariationsBlock = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (isInstructionalLine(line)) {
        continue;
      }
      if (line.includes('<')) {
        continue;
      }
      const name = matchLine(line, 'name|product name');
      if (name) {
        payload.name = name;
        inVariationsBlock = false;
        continue;
      }
      const price = matchLine(line, 'price');
      if (price) {
        payload.price = parseNumericValue(price);
        inVariationsBlock = false;
        continue;
      }
      const regular = matchLine(line, 'regular price|base price');
      if (regular) {
        payload.regular_price = parseNumericValue(regular);
        inVariationsBlock = false;
        continue;
      }
      const sale = matchLine(line, 'sale price|discount price|discount');
      if (sale) {
        payload.sale_price = parseNumericValue(sale);
        inVariationsBlock = false;
        continue;
      }
      const shortDesc = matchLine(line, 'short description|short desc');
      if (shortDesc) {
        payload.short_description = shortDesc;
        inVariationsBlock = false;
        continue;
      }
      const desc = matchLine(line, 'description');
      if (desc) {
        payload.description = desc;
        inVariationsBlock = false;
        continue;
      }
      const categories = matchLine(line, 'categories|category')
        || line.match(/\b(?:add|set)\s+categor(?:y|ies)\b\s*(.+)$/i)?.[1]?.trim();
      if (categories) {
        payload.categories = parseAiList(categories);
        inVariationsBlock = false;
        continue;
      }
      const tags = matchLine(line, 'tags|tag')
        || line.match(/\b(?:add|set)\s+tags?\b\s*(.+)$/i)?.[1]?.trim();
      if (tags) {
        payload.tags = parseAiList(tags);
        inVariationsBlock = false;
        continue;
      }
      const variationsToggle = matchLine(line, 'enable variations|variations');
      if (variationsToggle) {
        payload.variation_enabled = variationsToggle;
        inVariationsBlock = false;
        continue;
      }
      const sizeGuide = matchLine(line, 'size guide|sizeguide');
      if (sizeGuide) {
        payload.size_guide = sizeGuide;
        inVariationsBlock = false;
        continue;
      }
      const status = matchLine(line, 'status');
      if (status) {
        payload.status = status;
        inVariationsBlock = false;
        continue;
      }
      if (/^variations?\s*:?\s*$/i.test(line)) {
        inVariationsBlock = true;
        continue;
      }
      if (inVariationsBlock && /^[\s•*-]/.test(line)) {
        const parsedVariation = parseVariationLine(line, attributeSources, toSlug);
        if (parsedVariation) {
          payload.variations_from_terms = payload.variations_from_terms || [];
          payload.variations_from_terms.push(parsedVariation.attributes);
          payload.attribute_terms = payload.attribute_terms || {};
          Object.entries(parsedVariation.attributeTerms).forEach(([key, values]) => {
            payload.attribute_terms[key] = [
              ...(payload.attribute_terms[key] || []),
              ...values,
            ];
          });
        }
        continue;
      }
      if (!/[:=]/.test(line)) {
        const statusToken = String(line || '').trim().toLowerCase();
        if (['draft', 'publish', 'published', 'live'].includes(statusToken)) {
          payload.status = statusToken;
          inVariationsBlock = false;
          continue;
        }
      }
      const variationLine = matchLine(line, 'variation|variant');
      if (variationLine) {
        const tokens = parseAiTokens(variationLine);
        const attributes = {};
        tokens.forEach((token) => {
          const parts = token.split(/[:=]/).map((part) => part.trim()).filter(Boolean);
          let attribute = null;
          let value = null;
          if (parts.length >= 2) {
            attribute = findAttributeByKey(parts[0], attributeSources);
            value = parts.slice(1).join(' ');
          } else {
            value = token;
            attribute = attributeSources.find((attr) => {
              const terms = Array.isArray(attr?.terms) ? attr.terms : [];
              return terms.some((term) => {
                const termName = term?.name || term?.label || '';
                const termSlug = term?.slug || toSlug(termName);
                const normalizedValue = normalizeToken(value);
                return normalizeToken(termName) === normalizedValue || normalizeToken(termSlug) === normalizedValue;
              });
            }) || null;
          }
          if (!attribute || !value) return;
          const key = attribute.taxonomy || attribute.name || attribute.label;
          const terms = Array.isArray(attribute.terms) ? attribute.terms : [];
          const normalizedValue = normalizeToken(value);
          const matchedTerm = terms.find((term) => {
            const termName = term?.name || term?.label || '';
            const termSlug = term?.slug || toSlug(termName);
            return normalizeToken(termName) === normalizedValue || normalizeToken(termSlug) === normalizedValue;
          });
          const optionSlug = matchedTerm?.slug || toSlug(matchedTerm?.name || value);
          attributes[key] = optionSlug;
          payload.attribute_terms = payload.attribute_terms || {};
          payload.attribute_terms[key] = [
            ...(payload.attribute_terms[key] || []),
            matchedTerm?.name || value,
          ];
        });
        if (Object.keys(attributes).length) {
          payload.variations_from_terms = payload.variations_from_terms || [];
          payload.variations_from_terms.push(attributes);
        }
        inVariationsBlock = false;
        continue;
      }
      const keyValueMatch = line.match(/^(.+?)\s*(?:=|:)\s*(.+)$/);
      if (keyValueMatch) {
        const attribute = findAttributeByKey(keyValueMatch[1], attributeSources);
        if (attribute) {
          const key = attribute.taxonomy || attribute.name || attribute.label;
          const values = parseAiList(keyValueMatch[2]);
          payload.attribute_terms = payload.attribute_terms || {};
          payload.attribute_terms[key] = [
            ...(payload.attribute_terms[key] || []),
            ...values,
          ];
          inVariationsBlock = false;
          continue;
        }
      }
      if (!/[:=]/.test(line)) {
        const values = parseAiList(line);
        const matched = values.some((value) => {
          const normalizedValue = normalizeToken(value);
          if (!normalizedValue) return false;
          const owner = attributeSources.find((attribute) => {
            const terms = Array.isArray(attribute?.terms) ? attribute.terms : [];
            return terms.some((term) => {
              const termName = term?.name || term?.label || '';
              const termSlug = term?.slug || toSlug(termName);
              return normalizeToken(termName) === normalizedValue || normalizeToken(termSlug) === normalizedValue;
            });
          });
          if (owner) {
            const key = owner.taxonomy || owner.name || owner.label;
            payload.attribute_terms = payload.attribute_terms || {};
            payload.attribute_terms[key] = [
              ...(payload.attribute_terms[key] || []),
              value,
            ];
            return true;
          }
          return false;
        });
        if (matched) {
          inVariationsBlock = false;
          continue;
        }
      }
      if (/attributes\s*[:=]/i.test(line)) {
        warnings.push('Attributes require JSON (attributes: [...]).');
        inVariationsBlock = false;
        continue;
      }
      if (/variations\s*[:=]/i.test(line)) {
        warnings.push('Variations require JSON (variations: [...]).');
      }
      inVariationsBlock = false;
    }

    if (!Object.keys(payload).length) {
      const lower = trimmed.toLowerCase();
      if (
        lower.includes('do you want') ||
        lower.includes('would you like') ||
        lower.includes('there is no') ||
        lower.includes('enter the')
      ) {
        return { error: 'No updates found.' };
      }
    }

    if (!Object.keys(payload).length) {
      return { error: 'No structured fields detected. Use tagged fields like <product_name>Title<product_name>.' };
    }
    return { payload, warnings };
  };

  const applyAiPayload = (payload, selectedIdOverride = '') => {
    if (!payload || typeof payload !== 'object') return [];
    const changes = [];
    let statusUrl = '';
    const nextFormUpdates = {};
    let nextStatus = null;

    if (payload.name) {
      nextFormUpdates.name = String(payload.name);
      changes.push('name');
    }
    if (payload.regular_price) {
      const value = String(payload.regular_price);
      nextFormUpdates.regular_price = value;
      nextFormUpdates.price = value;
      changes.push('regular price');
    } else if (payload.price) {
      const value = String(payload.price);
      nextFormUpdates.price = value;
      nextFormUpdates.regular_price = value;
      changes.push('price');
    }
    if (payload.sale_price) {
      nextFormUpdates.sale_price = String(payload.sale_price);
      changes.push('sale price');
    }
    if (payload.description) {
      nextFormUpdates.description = String(payload.description);
      changes.push('description');
    }
    if (payload.short_description) {
      nextFormUpdates.short_description = String(payload.short_description);
      changes.push('short description');
    }
    if (payload.sku) {
      nextFormUpdates.sku = String(payload.sku);
      changes.push('sku');
    }
    if (payload.stock_quantity !== undefined) {
      nextFormUpdates.stock_quantity = String(payload.stock_quantity);
      nextFormUpdates.manage_stock = payload.stock_quantity !== '' && payload.stock_quantity !== null;
      changes.push('stock quantity');
    }
    if (payload.status) {
      const normalized = String(payload.status).trim().toLowerCase();
      nextStatus = normalized === 'live' ? 'publish' : normalized;
      nextFormUpdates.status = nextStatus;
      changes.push('status');
    }
    if (Object.keys(nextFormUpdates).length) {
      setForm((prev) => ({
        ...prev,
        ...nextFormUpdates,
      }));
      const nextFormPreview = { ...form, ...nextFormUpdates };
      if (nextStatus) {
        const baseUrl = buildProductUrl(savedProduct || product || nextFormPreview, readStoredSiteInfo(), previewSlug);
        if (nextStatus !== 'publish') {
          statusUrl = previewUrl || baseUrl || liveUrl || '';
        }
      }
    }

    if (payload.categories) {
      const values = parseAiList(payload.categories);
      setSelectedCategories(mapNamesToIds(values, availableCategories));
      changes.push('categories');
    }
    if (payload.tags) {
      const values = parseAiList(payload.tags);
      setSelectedTags(mapNamesToIds(values, availableTags));
      changes.push('tags');
    }
    if (payload.variation_enabled !== undefined) {
      const raw = String(payload.variation_enabled).trim().toLowerCase();
      const shouldEnable = ['on', 'true', 'yes', 'enable', 'enabled', '1'].includes(raw);
      setVariationEnabled(shouldEnable);
      setForm((prev) => ({
        ...prev,
        product_type: shouldEnable ? 'variable' : 'simple',
      }));
      changes.push(shouldEnable ? 'enable variations' : 'disable variations');
    }
    if (payload.size_guide) {
      const name = String(payload.size_guide).trim().toLowerCase();
      const match = sizeGuides.find((guide) =>
        String(guide?.title || '').trim().toLowerCase() === name
      );
      if (match) {
        setSizeGuideEnabled(true);
        setSelectedSizeGuideId(String(match.id));
        changes.push('size guide');
      }
    }
    if (Array.isArray(payload.attributes)) {
      const nextAttributes = payload.attributes
        .map((attr) => {
          const taxonomy = attr.taxonomy || attr.name || '';
          const catalogMatch = availableAttributes.find((item) =>
            taxonomy ? item.taxonomy === taxonomy : item.name === attr.name,
          );
          const terms = Array.isArray(catalogMatch?.terms) ? catalogMatch.terms : [];
          const options = Array.isArray(attr.options) ? attr.options : [];
          const mergedTerms = [...terms];
          const selectedOptionIds = [];
          options.forEach((opt) => {
            const optionName = typeof opt === 'string' ? opt : opt.name || opt.label || opt.slug;
            if (!optionName) return;
            const existing = terms.find((term) => {
              const termName = term?.name || term?.label || '';
              const termSlug = term?.slug || toSlug(termName);
              return termName.toLowerCase() === optionName.toLowerCase() || termSlug === toSlug(optionName);
            });
            const term = existing || { id: optionName, name: optionName, slug: toSlug(optionName) };
            if (!existing) {
              mergedTerms.push(term);
            }
            selectedOptionIds.push(term.id || term.name);
          });
          return {
            id: catalogMatch?.id || taxonomy || attr.name,
            name: attr.name || catalogMatch?.name || taxonomy,
            label: attr.label || catalogMatch?.label || attr.name || taxonomy,
            taxonomy: taxonomy || catalogMatch?.taxonomy || '',
            terms: mergedTerms,
            selectedOptionIds,
          };
        })
        .filter((item) => item.name || item.taxonomy);
      setSelectedAttributes(nextAttributes);
      setVariationEnabled(true);
      changes.push('attributes');
    }
    if (payload.attribute_terms) {
      const selections = payload.attribute_terms;
      setSelectedAttributes((prev) => {
        const next = [...prev];
        const sources = [...prev, ...availableAttributes];
        Object.entries(selections).forEach(([rawKey, values]) => {
          const attribute = findAttributeByKey(rawKey, sources);
          if (!attribute) return;
          const key = attribute.taxonomy || attribute.name || rawKey;
          let existing = next.find((item) => (item.taxonomy || item.name) === key);
          if (!existing) {
            existing = {
              id: attribute.id || key,
              name: attribute.name || attribute.label || key,
              label: attribute.label || attribute.name || key,
              taxonomy: attribute.taxonomy || '',
              terms: Array.isArray(attribute.terms) ? [...attribute.terms] : [],
              selectedOptionIds: [],
            };
            next.push(existing);
          }
          const normalizedValues = parseAiList(values);
          normalizedValues.forEach((value) => {
            const normalizedValue = normalizeToken(value);
            if (!normalizedValue) return;
            let term = existing.terms.find((item) => {
              const termName = item?.name || item?.label || '';
              const termSlug = item?.slug || toSlug(termName);
              return normalizeToken(termName) === normalizedValue || normalizeToken(termSlug) === normalizedValue;
            });
            if (!term) {
              return;
            }
            const termId = term.id || term.name;
            if (!existing.selectedOptionIds.includes(termId)) {
              existing.selectedOptionIds.push(termId);
            }
          });
        });
        return next;
      });
      setVariationEnabled(true);
      onRequestAutoGenerate?.();
      changes.push('attributes');
    }
    if (Array.isArray(payload.variations_from_terms)) {
      const next = payload.variations_from_terms.map((attributes, index) => ({
        id: `ai-${Date.now()}-${index}`,
        attributes,
        use_custom_price: false,
        regular_price: '',
        sale_price: '',
        sku: '',
        stock_quantity: '',
        image_id: '',
      }));
      setVariations((prev) => [...prev, ...next]);
      setVariationEnabled(true);
      changes.push('variations');
    }
    if (Array.isArray(payload.variations)) {
      setVariations(payload.variations);
      setVariationEnabled(true);
      changes.push('variations');
    }

    if (statusUrl) {
      changes.push(`url: ${statusUrl}`);
    }
    return changes;
  };

  const handleAiApply = useCallback(() => {
    const trimmed = aiInput.trim();
    let payload = null;
    let sendOnly = false;
    const userMessage = {
      role: 'user',
      content: trimmed,
    };
    setAiStatusLine('Thinking');

    if (!trimmed) {
      setAiMessages((prev) => [
        ...prev,
        { role: 'user', content: aiInput },
        { role: 'assistant', content: 'Type a request first.' },
      ]);
      return;
    } else {
      const result = parseAiInput(aiInput);
      if (result.error) {
        sendOnly = true;
        payload = {};
      } else {
        payload = result.payload;
      }
    }

    let nextMessages = [...aiMessages, userMessage];
    if (!sendOnly) {
      applyAiPayload(payload);
    }
    setAiMessages(nextMessages);

    const urlMatch = trimmed.match(/https?:\/\/\S+/i);
    const fetchUrl = urlMatch ? urlMatch[0].replace(/[),.;]+$/g, '') : '';
    const messageForServer = fetchUrl
      ? trimmed === fetchUrl || /^fetch\s+/i.test(trimmed)
        ? 'Use the fetched page content to update the product fields.'
        : `${trimmed}\nUse the fetched page content.`
      : trimmed;
    const categoriesReady = Array.isArray(availableCategories) && availableCategories.length > 0;
    const tagsReady = Array.isArray(availableTags) && availableTags.length > 0;
    const categoryContext = categoriesReady
      ? buildCatalogJsonContext(
          'Available categories (JSON)',
          availableCategories,
          (item) => ({
            name: item?.name,
            slug: item?.slug,
          }),
        )
      : '';
    const tagContext = tagsReady
      ? buildCatalogJsonContext(
          'Available tags (JSON)',
          availableTags,
          (item) => ({
            name: item?.name,
            slug: item?.slug,
          }),
        )
      : '';
    const attributeContext = buildCatalogJsonContext(
      'Available attributes (JSON)',
      availableAttributes,
      (item) => ({
        taxonomy: item?.taxonomy,
        name: item?.name || item?.label,
        terms: Array.isArray(item?.terms)
          ? item.terms
              .map((term) => ({
                name: term?.name || term?.label,
                slug: term?.slug,
              }))
              .filter((term) => term.name || term.slug || term.id)
          : [],
      }),
    );
    const systemInstruction = [
      ASSISTANT_AI_SYSTEM_INSTRUCTIONS,
      categoryContext,
      tagContext,
      attributeContext,
    ]
      .filter(Boolean)
      .join(' ');
    const historyForServer = [
      { role: 'system', content: systemInstruction },
      ...nextMessages
        .map((message) => ({ role: message.role, content: message.content }))
        .filter((message) => message.content),
    ];
    console.log('assistant-ai system instructions', {
      systemInstruction,
      categoryContext,
      tagContext,
      attributeContext,
      categoriesCount: availableCategories.length,
      tagsCount: availableTags.length,
      attributesCount: Array.isArray(availableAttributes) ? availableAttributes.length : 0,
    });
    const authToken = localStorage.getItem('agentic_auth_token');
    if (!authToken) {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sign in to use AI.' },
      ]);
    } else if (messageForServer) {
      setIsSending(true);
      fetch(`${CHAT_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: messageForServer,
          history: historyForServer,
          use_client_instructions_only: true,
          fetch_url: fetchUrl || undefined,
          images: null,
        }),
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            const errorMessage = payload?.error || 'Request failed.';
            if (/model.*(unavailable|overloaded|not available|capacity)|unavailable model/i.test(errorMessage)) {
              setAiStatusLine('Model Unavailable Switching...');
              await switchToAutoModel();
            }
            throw new Error(errorMessage);
          }
          const reply = formatAssistantReply(payload?.reply || '');
          if (reply) {
            setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
            const parsed = parseAiInput(reply);
            if (parsed?.payload) {
              applyAiPayload(parsed.payload);
            }
          }
        })
        .catch(async (error) => {
          if (/model.*(unavailable|overloaded|not available|capacity)|unavailable model/i.test(error?.message || '')) {
            setAiStatusLine('Model Unavailable Switching...');
            await switchToAutoModel();
          }
          setAiMessages((prev) => [
            ...prev,
            { role: 'assistant', content: error?.message || 'AI request failed.' },
          ]);
        })
        .finally(() => {
          setIsSending(false);
        });
    }

    setAiInput('');
  }, [aiInput, aiMessages, switchToAutoModel]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAiOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-lg"
        aria-label="Open AI assistant"
      >
        {aiOpen ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12" />
            <path d="M6 18L18 6" />
          </svg>
        ) : (
          'AI'
        )}
      </button>
      {aiOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px]">
          <div className="rounded-[28px] border border-white/60 bg-gradient-to-br from-slate-50 via-violet-50 to-blue-100 p-[2px] shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex h-[540px] flex-col overflow-hidden rounded-[26px] bg-white/90 backdrop-blur">
              <div className="relative px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {siteLogo ? (
                      <img src={siteLogo} alt="Store logo" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
                        WC
                      </span>
                    )}
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-slate-800">Editor AI</p>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setModelMenuOpen((prev) => !prev)}
                          disabled={isModelLoading}
                          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600"
                        >
                          {selectedModel.type === 'auto'
                            ? 'Auto'
                            : getProviderLabel(selectedModel.provider)}
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-3 w-3 transition ${modelMenuOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {modelMenuOpen && (
                          <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-white/70 bg-white/95 p-2 text-[11px] text-slate-600 shadow-lg backdrop-blur">
                            <div className="mb-2 font-semibold text-slate-500">Models</div>
                            <div className="max-h-48 space-y-1 overflow-auto pr-1">
                              <button
                                type="button"
                                onClick={() => handleModelChange('auto')}
                                className="w-full rounded-xl px-2 py-1 text-left text-slate-600 hover:bg-slate-100"
                              >
                                Auto
                              </button>
                              {selectedModel.type === 'model' && selectedModel.isCustom ? (
                                <button
                                  type="button"
                                  onClick={() => handleModelChange(selectedModel.id)}
                                  className="w-full rounded-xl px-2 py-1 text-left text-slate-600 hover:bg-slate-100"
                                >
                                  {selectedModel.label || selectedModel.id}
                                </button>
                              ) : null}
                              {modelOptions.map((model) => (
                                <button
                                  type="button"
                                  key={model.id}
                                  onClick={() => handleModelChange(model.id)}
                                  className="w-full rounded-xl px-2 py-1 text-left text-slate-600 hover:bg-slate-100"
                                >
                                  {model.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600 whitespace-nowrap"
                  >
                    Past Conversations
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3 w-3 transition ${historyOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiMessages([]);
                      setAiInput('');
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[12px] font-semibold text-slate-600"
                    aria-label="New conversation"
                    title="New conversation"
                  >
                    +
                  </button>
                </div>
              </div>
                {historyOpen && (
                  <div className="absolute left-4 right-4 top-full z-20 mt-2 rounded-2xl border border-white/70 bg-white/95 p-3 text-[11px] text-slate-600 shadow-lg backdrop-blur">
                    <div className="mb-2 font-semibold text-slate-500">Recent</div>
                    {historyLoading ? (
                      <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] text-slate-500">
                        Loading sessions...
                      </div>
                    ) : historySessions.length ? (
                      <div className="max-h-48 space-y-1 overflow-auto pr-1">
                        {historySessions.map((session) => {
                          const title =
                            session?.title
                              || session?.name
                              || session?.last_message
                              || session?.preview
                              || 'Untitled';
                          return (
                            <button
                              type="button"
                              key={session.id || title}
                              onClick={() => handleHistorySelect(session.id)}
                              className="w-full rounded-xl px-2 py-1 text-left text-slate-600 hover:bg-slate-100"
                            >
                              <span className="block truncate">{title}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] text-slate-500">
                        No recent sessions.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-auto px-4 pb-4 text-xs text-slate-600">
                {!aiMessages.length && (
                  <div className="max-w-[75%] rounded-2xl bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
                    Try: "update price to 5000", "write a short description", "add tags: summer, gift", or "set status to publish".
                  </div>
                )}
                {aiMessages.map((message, index) => {
                  const taggedRows = message.role === 'assistant' ? getTaggedDisplayRows(message.content) : [];
                  return (
                  <div key={`ai-msg-${index}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div className={`flex flex-col gap-2 ${message.role === 'user' ? 'max-w-[75%]' : 'w-full'}`}>
                        {message.content ? (
                          taggedRows.length ? (
                            <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-[12px] text-slate-700 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)]">
                              <div className="space-y-2">
                                {taggedRows.map((row) => (
                                  <div key={`${row.label}-${row.value}`} className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {row.label}
                                    </span>
                                    <span className="text-[12px] text-slate-700">{row.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p
                              className={`rounded-2xl px-4 py-3 text-[12px] leading-relaxed shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)] ${
                                message.role === 'user'
                                  ? 'bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 text-white'
                                  : 'border border-white/70 bg-white/85 text-slate-700'
                              } whitespace-pre-line`}
                            >
                              {message.content}
                            </p>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-[12px] text-slate-600 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.45)]">
                      <div className="flex flex-col gap-1">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                        </span>
                        <span>{aiStatusLine}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2 py-2 shadow-inner">
                  <input
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    placeholder="Chat here..."
                    className="flex-1 bg-transparent text-[11px] text-slate-600 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAiApply}
                    disabled={isSending}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M4 4l16 8-16 8 4-8-4-8z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">Use JSON for attributes/variations.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AssistantAI;
