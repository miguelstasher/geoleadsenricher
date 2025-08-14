import React, { useState, useEffect } from "react";

interface CategoryPacksManagerProps {
  categories: string[];
}

interface CategoryPack {
  name: string;
  categories: string[];
}

const MAX_PACKS = 5;
const MAX_CATEGORIES = 10;
const LOCAL_STORAGE_KEY = "categoryPacks";

const CategoryPacksManager: React.FC<CategoryPacksManagerProps> = ({ categories }) => {
  const [packs, setPacks] = useState<CategoryPack[]>([]);
  const [newPackName, setNewPackName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) setPacks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(packs));
  }, [packs]);

  useEffect(() => {
    setSelectedCategories((prev) => prev.filter((cat) => categories.includes(cat)));
  }, [categories]);

  const handleCreatePack = () => {
    if (!newPackName.trim()) {
      setError("Pack name required");
      return;
    }
    if (packs.length >= MAX_PACKS) {
      setError("Maximum 5 packs allowed");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("Select at least one category");
      return;
    }
    if (selectedCategories.length > MAX_CATEGORIES) {
      setError("Maximum 10 categories per pack");
      return;
    }
    if (packs.some((p) => p.name.toLowerCase() === newPackName.trim().toLowerCase())) {
      setError("Pack name must be unique");
      return;
    }
    setPacks([...packs, { name: newPackName.trim(), categories: selectedCategories }]);
    setNewPackName("");
    setSelectedCategories([]);
    setError("");
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Pack name"
          value={newPackName || ""}
          onChange={(e) => setNewPackName(e.target.value)}
          className="border rounded px-2 py-1 mr-2"
        />
        {categories.length > 0 ? (
          <select
            multiple
            value={selectedCategories.filter(cat => categories.includes(cat))}
            onChange={(e) =>
              setSelectedCategories(Array.from(e.target.selectedOptions, (opt) => opt.value))
            }
            className="border rounded px-2 py-1 mr-2"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        ) : (
          <select multiple disabled className="border rounded px-2 py-1 mr-2">
            <option>No categories available</option>
          </select>
        )}
        <button
          onClick={handleCreatePack}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Create Pack
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div>
        {packs.length === 0 && <div className="text-gray-500">No packs created yet.</div>}
        {packs.map((pack, idx) => (
          <div key={idx} className="mb-2 p-2 border rounded bg-gray-50">
            <strong>{pack.name}</strong>: {pack.categories.join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPacksManager; 