import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { SEARCH_ENGINES } from '../types';

const DEFAULT_ENGINE_STORAGE_KEY = 'default_search_engine_name';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [selectedEngine, setSelectedEngine] = useState(() => {
    const savedEngineName = localStorage.getItem(DEFAULT_ENGINE_STORAGE_KEY);
    return SEARCH_ENGINES.find((engine) => engine.name === savedEngineName) || SEARCH_ENGINES[0];
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.open(selectedEngine.url + encodeURIComponent(query.trim()), '_blank');
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        {/* Search Engine Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 px-3 py-3 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white border-r border-gray-200 dark:border-gray-700 rounded-l-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span>{selectedEngine.icon}</span>
            <span className="text-sm font-medium hidden sm:inline">{selectedEngine.name}</span>
            <ChevronDown size={14} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                {SEARCH_ENGINES.map((engine) => (
                  <button
                    key={engine.name}
                    type="button"
                    onClick={() => {
                      setSelectedEngine(engine);
                      localStorage.setItem(DEFAULT_ENGINE_STORAGE_KEY, engine.name);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedEngine.name === engine.name ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span>{engine.icon}</span>
                    <span>{engine.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`使用 ${selectedEngine.name} 搜索...`}
          className="flex-1 px-4 py-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none outline-none"
        />

        {/* Search Button */}
        <button
          type="submit"
          className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
        >
          <Search size={20} />
        </button>
      </div>
    </form>
  );
}
