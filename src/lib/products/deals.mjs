export const getDealExpiryTimestamp = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const timestamp = new Date(raw).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getDealRemainingMs = (expiresAt, nowMs = Date.now()) => {
  const expiry = getDealExpiryTimestamp(expiresAt);
  if (!expiry) return 0;
  return Math.max(0, expiry - nowMs);
};

export const hasActiveDealPricing = ({ currentPrice, originalPrice }) => {
  const current = Number(currentPrice) || 0;
  const original = Number(originalPrice) || 0;
  return current > 0 && original > 0 && original > current;
};

export const isActiveTimedDeal = ({
  expiresAt,
  currentPrice,
  originalPrice,
  nowMs = Date.now(),
}) =>
  hasActiveDealPricing({ currentPrice, originalPrice }) &&
  getDealRemainingMs(expiresAt, nowMs) > 0;

export const getDealCountdownParts = (expiresAt, nowMs = Date.now()) => {
  const totalSeconds = Math.max(0, Math.floor(getDealRemainingMs(expiresAt, nowMs) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { key: 'days', label: 'Days', value: String(days).padStart(2, '0') },
    { key: 'hours', label: 'Hours', value: String(hours).padStart(2, '0') },
    { key: 'minutes', label: 'Mins', value: String(minutes).padStart(2, '0') },
    { key: 'seconds', label: 'Secs', value: String(seconds).padStart(2, '0') },
  ];
};

export const formatDealCountdownLabel = (expiresAt, nowMs = Date.now()) => {
  const parts = getDealCountdownParts(expiresAt, nowMs);
  const [days, hours, minutes, seconds] = parts;
  if (Number(days?.value || 0) > 0) {
    return `${days.value}d ${hours.value}:${minutes.value}:${seconds.value}`;
  }
  return `${hours.value}:${minutes.value}:${seconds.value}`;
};

export const getDealStockState = (stockCount, initialStockCount = stockCount) => {
  const safeStock = Math.max(0, Number(stockCount) || 0);
  const safeInitialStock = Math.max(safeStock, Number(initialStockCount) || 0);
  const hasStockDropped = safeStock < safeInitialStock;
  if (safeStock <= 0) {
    return {
      tone: 'soldout',
      label: 'Sold out',
      helper: 'This deal is no longer available.',
      progress: 100,
    };
  }
  if (!hasStockDropped) {
    return {
      tone: 'active',
      label: `${safeStock} items available`,
      helper: 'Deal stock available',
      progress: safeStock < 15 ? 56 : safeStock < 40 ? 52 : 42,
    };
  }
  if (safeStock < 15) {
    return {
      tone: 'urgent',
      label: `Hurry, only ${safeStock} left`,
      helper: `${safeStock} items left`,
      progress: 90,
    };
  }
  if (safeStock < 40) {
    return {
      tone: 'warning',
      label: `${safeStock} items left`,
      helper: 'Moving fast',
      progress: 72,
    };
  }
  if (safeStock < 100) {
    return {
      tone: 'active',
      label: `${safeStock} items left`,
      helper: 'Deal stock available',
      progress: 56,
    };
  }
  return {
    tone: 'active',
    label: `${safeStock} items left`,
    helper: 'In stock',
    progress: 42,
  };
};
