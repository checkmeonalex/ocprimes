'use client';

const AssistantButton = ({ className = '', ...props }) => (
  <button
    type="button"
    className={`rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 ${className}`}
    {...props}
  >
    Assistant
  </button>
);

export default AssistantButton;
