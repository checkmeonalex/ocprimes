const normalizeToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const parseAiList = (value) =>
  String(value || '')
    .split(/,|\band\b/i)
    .map((item) => item.trim())
    .filter(Boolean);

const mapNamesToIds = (values, catalog = []) =>
  values
    .map((value) => {
      const raw = String(value).trim();
      const normalized = normalizeToken(raw);
      const match = catalog.find((item) => {
        const id = item?.id;
        const name = item?.name || '';
        const slug = item?.slug || '';
        return (
          String(id) === raw ||
          normalizeToken(name) === normalized ||
          normalizeToken(slug) === normalized
        );
      });
      return match?.id || '';
    })
    .filter(Boolean);

const IMAGE_ASSISTANT_SYSTEM_INSTRUCTIONS = [
  'You are the product editor assistant.',
  'Write in a professional admin catalog style.',
  'Only use these fields: Product Name, Short Description, Description, Categories, Tags.',
  'Respond only with open-tag format: <field>value<field>.',
  'Allowed tags: product_name, short_description, description, categories, tags.',
  'Use only the provided categories and tags lists; if none match, return empty categories/tags.',
  'Template: <product_name>WRITE THE BEST-FIT PRODUCT NAME BASED ON THE IMAGE</product_name> <short_description>WRITE ONE SHORT SENTENCE (max 18 words) DESCRIBING THE PRODUCT</short_description> <description>WRITE 2–4 SENTENCES: what it is, key visible features/material, and primary use</description> <categories>WRITE 1–3 CATEGORY PATHS separated by "," each</categories> <tags>WRITE 8–20 comma-separated tags only using my available tag</tags>.',
  'Do not include any extra text outside tags (no "Product:" or "Tag:" lines).',
  'If you are unsure, still output best-guess tags only.',
  'Output example: <product_name>...<product_name> <short_description>...<short_description> <description>...<description> <categories>...<categories> <tags>...<tags>.',
].join(' ');

const buildImageAssistantInstruction = (availableCategories, availableTags) => {
  const categoryContext = Array.isArray(availableCategories) && availableCategories.length
    ? `Available categories: ${JSON.stringify(availableCategories.map((item) => ({ name: item?.name, slug: item?.slug })))}`
    : '';
  const tagContext = Array.isArray(availableTags) && availableTags.length
    ? `Available tags: ${JSON.stringify(availableTags.map((item) => ({ name: item?.name, slug: item?.slug })))}`
    : '';
  return [
    IMAGE_ASSISTANT_SYSTEM_INSTRUCTIONS,
    categoryContext,
    tagContext,
  ]
    .filter(Boolean)
    .join(' ');
};

const parseImageAiResponse = (content) => {
  const text = String(content || '');
  const onlyTags = text.match(
    /<([A-Za-z0-9 _-]+)>([\s\S]*?)<\/\1>|<([A-Za-z0-9 _-]+)>([^<\n]+?)<\3>|<\s*([A-Za-z0-9 _-]+)\s*>\s*([^\n]+)|([^\n]+)<\s*([A-Za-z0-9 _-]+)\s*>/g
  );
  const filteredText = Array.isArray(onlyTags) ? onlyTags.join('\n') : '';
  const source = filteredText || text;
  const tagMap = {
    productname: 'name',
    name: 'name',
    shortdescription: 'short_description',
    description: 'description',
    categories: 'categories',
    tags: 'tags',
  };
  const payload = {};
  const extract = [];
  const fullTagRegex = /<([A-Za-z0-9 _-]+)>([\s\S]*?)<\/\1>/g;
  const openTagRegex = /<([A-Za-z0-9 _-]+)>([^<\n]+?)<\1>/g;
  let match = null;
  while ((match = fullTagRegex.exec(source))) {
    extract.push([match[1], match[2]]);
  }
  if (!extract.length) {
    while ((match = openTagRegex.exec(source))) {
      extract.push([match[1], match[2]]);
    }
  }
  if (!extract.length) {
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const openLeadMatch = line.match(/^<\s*([A-Za-z0-9 _-]+)\s*>\s*(.+)$/);
        if (openLeadMatch) {
          extract.push([openLeadMatch[1], openLeadMatch[2]]);
        }
        const closingMatch = line.match(/^(.*)<\/\s*([A-Za-z0-9 _-]+)\s*>$/);
        if (closingMatch) {
          extract.push([closingMatch[2], closingMatch[1]]);
        }
        const openTailMatch = line.match(/^(.*)<\s*([A-Za-z0-9 _-]+)\s*>$/);
        if (openTailMatch) {
          extract.push([openTailMatch[2], openTailMatch[1]]);
        }
      });
  }
  extract.forEach(([rawKey, rawValue]) => {
    const key = normalizeToken(rawKey);
    const field = tagMap[key];
    if (!field) return;
    const cleaned = String(rawValue || '')
      .replace(/<\/?[^>]+>/g, '')
      .split('<')[0]
      .trim();
    const isPlaceholder = !cleaned || /^(\.*|…)+$/.test(cleaned) || cleaned === '...';
    if (isPlaceholder) return;
    if (!cleaned) return;
    if (['categories', 'tags'].includes(field)) {
      payload[field] = parseAiList(cleaned);
      return;
    }
    payload[field] = cleaned;
  });
  if (!Object.keys(payload).length) {
    const plain = String(source || '').replace(/<\/?[^>]+>/g, '').trim();
    if (plain && plain.length <= 80) {
      payload.name = plain;
    }
  }
  return payload;
};

const requestImageAssistant = async ({
  chatApiUrl,
  authToken,
  systemInstruction,
  message,
  imageUrl,
  requireTags = true,
}) => {
  const response = await fetch(`${chatApiUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      message,
      history: [{ role: 'system', content: systemInstruction }],
      use_client_instructions_only: true,
      require_tags: requireTags,
      images: [imageUrl],
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Image analysis failed.');
  }
  return String(payload?.reply || '');
};

const requestUrlAssistant = async ({
  chatApiUrl,
  authToken,
  systemInstruction,
  message,
  fetchUrl,
  requireTags = true,
}) => {
  const response = await fetch(`${chatApiUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      message,
      history: [{ role: 'system', content: systemInstruction }],
      use_client_instructions_only: true,
      require_tags: requireTags,
      fetch_url: fetchUrl,
      images: null,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'URL analysis failed.');
  }
  return String(payload?.reply || '');
};

export {
  IMAGE_ASSISTANT_SYSTEM_INSTRUCTIONS,
  buildImageAssistantInstruction,
  parseImageAiResponse,
  mapNamesToIds,
  requestImageAssistant,
  requestUrlAssistant,
};
