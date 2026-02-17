export const PRODUCT_EDITOR_STEPS = [
  { id: 'identity', label: 'Basics' },
  { id: 'commercial', label: 'Details' },
  { id: 'configuration', label: 'Variations' },
  { id: 'metadata', label: 'Tell Us More' },
  { id: 'review', label: 'Preview' },
];

const hasText = (value) => Boolean(String(value || '').trim());

export const isStepValid = ({
  stepId,
  form,
  selectedCategories,
  pendingCategoryRequestIds,
  selectedTags,
  variationEnabled,
  variations,
}) => {
  if (stepId === 'identity') {
    return hasText(form?.name) && hasText(form?.short_description) && hasText(form?.image_id);
  }
  if (stepId === 'commercial') {
    const basePrice = form?.regular_price || form?.price;
    const hasCategorySelection =
      (selectedCategories || []).length > 0 || (pendingCategoryRequestIds || []).length > 0;
    return hasText(basePrice) && hasCategorySelection && (selectedTags || []).length > 0;
  }
  if (stepId === 'configuration') {
    if (!variationEnabled) return true;
    return Array.isArray(variations) && variations.length > 0;
  }
  if (stepId === 'metadata') {
    return hasText(form?.condition_check);
  }
  return true;
};

export const getFurthestAccessibleStepIndex = (args) => {
  let furthest = 0;
  for (let index = 0; index < PRODUCT_EDITOR_STEPS.length - 1; index += 1) {
    const step = PRODUCT_EDITOR_STEPS[index];
    if (!isStepValid({ ...args, stepId: step.id })) {
      break;
    }
    furthest = index + 1;
  }
  return furthest;
};
