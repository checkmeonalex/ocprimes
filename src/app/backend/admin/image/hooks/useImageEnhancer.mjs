import { useMemo, useState } from 'react';

const ENHANCE_PRESETS = [
  { key: 'enhance', label: 'Enhance', boost: 0.18 },
  { key: 'hd', label: 'HD', boost: 0.35 },
  { key: 'ultra', label: 'Ultra HD', boost: 0.55 },
];

const DEFAULT_PRESET = 'enhance';

export const useImageEnhancer = (defaultPreset = DEFAULT_PRESET) => {
  const [presetKey, setPresetKey] = useState(defaultPreset);

  const activePreset =
    ENHANCE_PRESETS.find((preset) => preset.key === presetKey) || ENHANCE_PRESETS[0];

  const appliedFilters = useMemo(() => {
    const boost = activePreset.boost;
    return {
      brightness: 100 + boost * 12,
      contrast: 100 + boost * 18,
      saturate: 100 + boost * 20,
    };
  }, [activePreset.boost]);

  const resetEnhancer = () => setPresetKey(defaultPreset);

  return {
    presets: ENHANCE_PRESETS,
    presetKey,
    setPresetKey,
    appliedFilters,
    resetEnhancer,
  };
};
