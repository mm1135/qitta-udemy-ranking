"use client";

import TagSearch from "./TagSearch";

export default function TagSearchContainer() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-lg font-semibold mb-3">タグを検索</h2>
      <TagSearch />
    </div>
  );
} 