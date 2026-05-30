import { useCallback, useMemo, useState } from 'react';

export const ENHANCE_PRESETS = [
  { key: 'none',    label: 'Original',  desc: 'No changes',            boost: 0 },
  { key: 'enhance', label: 'Enhance',   desc: 'Subtle pop',            boost: 0.18 },
  { key: 'vivid',   label: 'Vivid',     desc: 'Punchy colours',        boost: 0.38 },
  { key: 'hd',      label: 'HD',        desc: 'Sharp & bright',        boost: 0.55 },
  { key: 'warm',    label: 'Warm',      desc: 'Golden tone',           boost: 0.28, warm: true },
  { key: 'cool',    label: 'Cool',      desc: 'Fresh blue tone',       boost: 0.28, cool: true },
  { key: 'bw',      label: 'B&W',       desc: 'Classic greyscale',     boost: 0.2,  bw: true },
];

const DEFAULT_PRESET = 'none';

export const useImageEnhancer = (defaultPreset = DEFAULT_PRESET) => {
  const [presetKey, setPresetKey] = useState(defaultPreset);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [isManual, setIsManual] = useState(false);

  const activePreset = ENHANCE_PRESETS.find((p) => p.key === presetKey) || ENHANCE_PRESETS[0];

  const appliedFilters = useMemo(() => {
    if (isManual) {
      return { brightness, contrast, saturate: saturation };
    }
    if (activePreset.key === 'none') {
      return { brightness: 100, contrast: 100, saturate: 100 };
    }
    const b = activePreset.boost;
    if (activePreset.bw) {
      return { brightness: 100 + b * 10, contrast: 100 + b * 25, saturate: 0 };
    }
    if (activePreset.warm) {
      return { brightness: 100 + b * 8, contrast: 100 + b * 12, saturate: 100 + b * 30, sepia: b * 30 };
    }
    if (activePreset.cool) {
      return { brightness: 100 + b * 5, contrast: 100 + b * 15, saturate: 100 + b * 15, hueRotate: b * 40 };
    }
    return {
      brightness: 100 + b * 12,
      contrast: 100 + b * 18,
      saturate: 100 + b * 20,
    };
  }, [activePreset, brightness, contrast, saturation, isManual]);

  const resetEnhancer = useCallback(() => {
    setPresetKey(defaultPreset);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setIsManual(false);
  }, [defaultPreset]);

  const setManualBrightness = useCallback((v) => { setBrightness(v); setIsManual(true); }, []);
  const setManualContrast   = useCallback((v) => { setContrast(v);   setIsManual(true); }, []);
  const setManualSaturation = useCallback((v) => { setSaturation(v); setIsManual(true); }, []);

  return {
    presets: ENHANCE_PRESETS,
    presetKey,
    setPresetKey: (k) => { setPresetKey(k); setIsManual(false); },
    appliedFilters,
    resetEnhancer,
    brightness, setManualBrightness,
    contrast,   setManualContrast,
    saturation, setManualSaturation,
    isManual,
  };
};
