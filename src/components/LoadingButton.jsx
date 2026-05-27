'use client';

const LoadingButton = ({
  isLoading = false,
  disabled = false,
  children,
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    className={className}
    {...props}
  >
    <span className="inline-flex items-center gap-2">
      {isLoading && (
        <span
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  </button>
);

export default LoadingButton;
