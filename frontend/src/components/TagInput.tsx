import { useState, useRef, useEffect } from 'react';
import { Tag, X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({ value, onChange, availableTags, placeholder = "添加标签...", disabled = false }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const suggestions = availableTags.filter(tag => 
    tag.toLowerCase().includes(inputValue.toLowerCase()) && 
    !value.includes(tag)
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        // If there's a matching suggestion, use it
        const exactMatch = suggestions.find(t => t.toLowerCase() === inputValue.toLowerCase());
        addTag(exactMatch || inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  // Handle comma separation
  const handleBlur = () => {
    if (inputValue.trim()) {
      // Don't auto-add on blur to avoid accidental tags, but handle comma-separated values
      const parts = inputValue.split(',').map(t => t.trim()).filter(Boolean);
      if (parts.length > 1) {
        parts.forEach(part => addTag(part));
      }
    }
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-50 text-blue-600 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="p-0.5 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => setShowSuggestions(true)}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
          placeholder={value.length === 0 ? placeholder : '继续添加...'}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          <div className="py-1">
            <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
              点击选择已有标签
            </div>
            {suggestions.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Tag size={14} className="text-gray-400" />
                  {tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint for new tag */}
      {showSuggestions && inputValue.trim() && !suggestions.some(t => t.toLowerCase() === inputValue.toLowerCase()) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-blue-500 font-medium">+</span>
              创建新标签 "{inputValue.trim()}"
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
