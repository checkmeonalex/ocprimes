function BouncingDotsLoader({ className = '', dotClassName = 'bg-slate-400' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`h-2 w-2 animate-bounce rounded-full ${dotClassName}`} />
      <span
        className={`h-2 w-2 animate-bounce rounded-full ${dotClassName}`}
        style={{ animationDelay: '0.15s' }}
      />
      <span
        className={`h-2 w-2 animate-bounce rounded-full ${dotClassName}`}
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  );
}

export default BouncingDotsLoader;
