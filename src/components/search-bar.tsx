'use client';

import { SearchAutocomplete } from './search-autocomplete';

export function SearchBar() {
  return (
    <div className="relative max-w-2xl mx-auto w-full">
      <SearchAutocomplete
        placeholder="Cari berdasarkan judul anime..."
        inputClassName="py-3.5 pl-10 pr-14 text-sm rounded-2xl shadow-xl"
      />
    </div>
  );
}
