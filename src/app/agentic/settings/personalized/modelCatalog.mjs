const PROVIDERS = [
  { id: 'default', name: 'Default' },
];

const MODELS = [
  { id: 'default-model', provider: 'default', label: 'Default Model' },
];

const findModelByProviderModel = (providerId, modelId) =>
  MODELS.find(
    (model) =>
      model.provider === providerId && model.id === modelId
  ) || null;

const getModelValue = (providerId, modelId) =>
  findModelByProviderModel(providerId, modelId)?.id || '';

export { MODELS, PROVIDERS, findModelByProviderModel, getModelValue };
