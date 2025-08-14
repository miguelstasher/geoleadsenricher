import React, { useState, useEffect } from "react";

interface BusinessCategoryGroupsManagerProps {
  categories: string[];
  groups: CategoryGroup[];
  setGroups: (groups: CategoryGroup[]) => void;
  onChange?: () => void;
}

interface CategoryGroup {
  name: string;
  categories: string[];
}

const MAX_GROUPS = 5;
const MAX_CATEGORIES = 10;
const LOCAL_STORAGE_KEY = "businessCategoryGroups";

const defaultGroup: CategoryGroup = { name: "", categories: [] };

const BusinessCategoryGroupsManager: React.FC<BusinessCategoryGroupsManagerProps> = ({ categories, groups, setGroups, onChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "duplicate">("create");
  const [currentGroup, setCurrentGroup] = useState<CategoryGroup>(defaultGroup);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);

  // Keep currentGroup.categories in sync with available categories
  useEffect(() => {
    setCurrentGroup((prev) => ({
      ...prev,
      categories: prev.categories.filter((cat) => categories.includes(cat)),
    }));
  }, [categories]);

  const openModal = (mode: "create" | "edit" | "duplicate", group?: CategoryGroup, index?: number) => {
    setModalMode(mode);
    setModalOpen(true);
    if (mode === "edit" && group && typeof index === "number") {
      setCurrentGroup({ ...group });
      setEditIndex(index);
    } else if (mode === "duplicate" && group) {
      setCurrentGroup({ name: group.name + " Copy", categories: [...group.categories] });
      setEditIndex(null);
    } else {
      setCurrentGroup(defaultGroup);
      setEditIndex(null);
    }
    setError("");
    setSearch("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentGroup(defaultGroup);
    setEditIndex(null);
    setError("");
    setSearch("");
  };

  const handleSave = () => {
    if (!currentGroup.name.trim()) {
      setError("Group name required");
      return;
    }
    if (currentGroup.categories.length === 0) {
      setError("Select at least one category");
      return;
    }
    if (currentGroup.categories.length > MAX_CATEGORIES) {
      setError("Maximum 10 categories per group");
      return;
    }
    if (
      groups.some((g, i) =>
        g.name.toLowerCase() === currentGroup.name.trim().toLowerCase() && i !== editIndex
      )
    ) {
      setError("Group name must be unique");
      return;
    }
    if (modalMode === "create" || modalMode === "duplicate") {
      if (groups.length >= MAX_GROUPS) {
        setError("Maximum 5 groups allowed");
        return;
      }
      setGroups([...groups, { name: currentGroup.name.trim(), categories: currentGroup.categories }]);
    } else if (modalMode === "edit" && editIndex !== null) {
      const updated = [...groups];
      updated[editIndex] = { name: currentGroup.name.trim(), categories: currentGroup.categories };
      setGroups(updated);
    }
    if (onChange) onChange();
    closeModal();
  };

  const handleDelete = (index: number) => {
    setGroupToDelete(index);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (groupToDelete !== null) {
      setGroups(groups.filter((_, i) => i !== groupToDelete));
      if (onChange) onChange();
      setGroupToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setGroupToDelete(null);
    setShowDeleteModal(false);
  };

  // Duplicate with unique name
  const handleDuplicate = (group: CategoryGroup) => {
    let baseName = group.name + ' Copy';
    let newName = baseName;
    let copyIndex = 2;
    const existingNames = groups.map(g => g.name);
    while (existingNames.includes(newName)) {
      newName = baseName + ' ' + copyIndex;
      copyIndex++;
    }
    setGroups([...groups, { name: newName, categories: [...group.categories] }]);
    if (onChange) onChange();
  };

  // Filtered categories for search
  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(search.toLowerCase())
  );

  // Toggle category selection
  const toggleCategory = (cat: string) => {
    if (currentGroup.categories.includes(cat)) {
      setCurrentGroup({
        ...currentGroup,
        categories: currentGroup.categories.filter(c => c !== cat),
      });
    } else if (currentGroup.categories.length < MAX_CATEGORIES) {
      setCurrentGroup({
        ...currentGroup,
        categories: [...currentGroup.categories, cat],
      });
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h4 className="text-md font-semibold">Business Category Groups</h4>
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
          onClick={() => openModal("create")}
          disabled={groups.length >= MAX_GROUPS}
        >
          + Create Group
        </button>
      </div>
      {groups.length === 0 && <div className="text-gray-500 mb-4">No groups created yet.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group, idx) => (
          <div key={idx} className="p-4 border rounded bg-gray-50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">{group.name}</span>
              <div className="flex gap-2">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => openModal("edit", group, idx)}
                >
                  Edit
                </button>
                <button
                  className="text-gray-600 hover:underline"
                  onClick={() => handleDuplicate(group)}
                >
                  Duplicate
                </button>
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => handleDelete(idx)}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.categories.map((cat) => (
                <span key={cat} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Modal for create/edit/duplicate */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">
              {modalMode === "edit" ? "Edit Group" : modalMode === "duplicate" ? "Duplicate Group" : "Create Group"}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                type="text"
                value={currentGroup.name}
                onChange={(e) => setCurrentGroup({ ...currentGroup, name: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1"
                maxLength={40}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Categories</label>
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 mb-2"
              />
              <div className="border rounded h-40 overflow-y-auto bg-gray-50">
                {filteredCategories.length === 0 && (
                  <div className="text-gray-400 text-center py-4">No categories found</div>
                )}
                {filteredCategories.map(cat => {
                  const selected = currentGroup.categories.includes(cat);
                  return (
                    <div
                      key={cat}
                      className={`flex items-center px-2 py-1 cursor-pointer hover:bg-blue-50 ${selected ? 'bg-blue-100' : ''}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      <span className={`mr-2 w-5 h-5 flex items-center justify-center rounded-full border ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white text-gray-300'}`}>
                        {selected ? (
                          <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M4 8.5l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/></svg>
                        )}
                      </span>
                      <span className="flex-1 text-sm select-none">{cat}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {currentGroup.categories.length} selected (max {MAX_CATEGORIES})
              </div>
            </div>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <h3 className="text-lg font-semibold mb-4">Delete Group</h3>
            <p className="mb-6">Are you sure you want to delete this group?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessCategoryGroupsManager; 