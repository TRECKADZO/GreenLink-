import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * StableInput - Input optimisé pour mobile qui ne perd pas le focus.
 * Utilise un state local + sync au parent via onBlur/onChange debounce
 * pour éviter que le re-rendu du parent ne démonte l'input.
 */
export const StableInput = React.memo(({ label, value, onChange, type = 'text', testid, placeholder, className = '' }) => {
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef(null);
  const isTyping = useRef(false);

  // Sync from parent only when not actively typing
  useEffect(() => {
    if (!isTyping.current && value !== undefined && value !== localValue) {
      setLocalValue(value ?? '');
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    isTyping.current = true;
    setLocalValue(v);
    onChange?.(v);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    isTyping.current = false;
    onChange?.(localValue);
  }, [localValue, onChange]);

  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-[#374151] mb-1">{label}</label>}
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622] bg-white ${className}`}
        data-testid={testid}
        autoComplete="off"
      />
    </div>
  );
});

StableInput.displayName = 'StableInput';

export const StableSelect = React.memo(({ label, value, onChange, testid, options, className = '' }) => {
  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-[#374151] mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622] bg-white ${className}`}
        data-testid={testid}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
});

StableSelect.displayName = 'StableSelect';

export const StableTextarea = React.memo(({ label, value, onChange, testid, placeholder, rows = 2 }) => {
  const [localValue, setLocalValue] = useState(value ?? '');
  const isTyping = useRef(false);

  useEffect(() => {
    if (!isTyping.current && value !== undefined && value !== localValue) {
      setLocalValue(value ?? '');
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((e) => {
    isTyping.current = true;
    setLocalValue(e.target.value);
    onChange?.(e.target.value);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    isTyping.current = false;
    onChange?.(localValue);
  }, [localValue, onChange]);

  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-[#374151] mb-1">{label}</label>}
      <textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-xs border border-[#E5E5E0] rounded-md resize-none bg-white"
        data-testid={testid}
        autoComplete="off"
      />
    </div>
  );
});

StableTextarea.displayName = 'StableTextarea';
