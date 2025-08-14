'use client';

import { useState, useEffect } from 'react';

type FilterField = {
  key: string;
  label: string;
};

type FilterOperator = {
  key: string;
  label: string;
};

interface CustomFilterProps {
  availableFields: FilterField[];
  onAddFilter: (field: string, operator: string, value: string) => void;
  onRemoveFilter: (index: number) => void;
  activeFilters: {field: string, operator: string, value: string}[];
  className?: string;
}

export default function CustomFilter({
  availableFields,
  onAddFilter,
  onRemoveFilter,
  activeFilters,
  className = ''
}: CustomFilterProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('contains');
  const [filterValue, setFilterValue] = useState('');
  const [operatorOptions, setOperatorOptions] = useState<string[]>([]);

  const operatorsByField: Record<string, string[]> = {
    // Default operators for text fields
    default: ['contains', 'does_not_contain', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    // Specific operators for email status
    email_status: ['is', 'is_not'],
    // Specific operators for boolean fields
    chain: ['is_chain', 'is_not_chain']
  };

  // Update operator options when field changes
  useEffect(() => {
    if (selectedField) {
      // Use field-specific operators or default ones
      const availableOperators = operatorsByField[selectedField] || operatorsByField.default;
      setOperatorOptions(availableOperators);
      setSelectedOperator(availableOperators[0]); // Set the first available operator
      setFilterValue(''); // Reset value when field changes
    }
  }, [selectedField]);

  // Human-readable operator labels
  const operatorLabels: Record<string, string> = {
    contains: 'Contains',
    does_not_contain: 'Does not contain',
    is: 'Is',
    is_not: 'Is not',
    is_empty: 'Is empty',
    is_not_empty: 'Is not empty',
    is_chain: 'Is chain',
    is_not_chain: 'Is not chain'
  };

  const handleAddFilter = () => {
    if (selectedField && selectedOperator) {
      // For "is empty" and "is not empty" operators, we don't need a value
      const needsValue = !['is_empty', 'is_not_empty'].includes(selectedOperator);
      
      if ((needsValue && filterValue) || !needsValue) {
        onAddFilter(selectedField, selectedOperator, filterValue);
        setSelectedField('');
        setSelectedOperator('contains');
        setFilterValue('');
        setShowModal(false);
      }
    }
  };
  
  const getOperatorLabel = (operatorKey: string) => {
    return operatorLabels[operatorKey] || operatorKey;
  };
  
  const getFieldLabel = (fieldKey: string) => {
    return availableFields.find(f => f.key === fieldKey)?.label || fieldKey;
  };
  
  const needsValueInput = !['is_empty', 'is_not_empty'].includes(selectedOperator);

  const formatFilterDisplay = (filter: {field: string, operator: string, value: string}) => {
    const fieldLabel = getFieldLabel(filter.field);
    const operatorKey = filter.operator;
    
    // For empty/not empty operators, we don't need to show the value
    if (operatorKey === 'is_empty' || operatorKey === 'is_not_empty') {
      return `${fieldLabel} ${getOperatorLabel(operatorKey)}`;
    }
    
    // For contains operator, format as "Name: Hotel" or "Name contains... Hotel"
    if (operatorKey === 'contains') {
      return `${fieldLabel}: ${filter.value}`;
    }
    
    // For other operators, show the complete format
    return `${fieldLabel} ${getOperatorLabel(operatorKey)} ${filter.value}`;
  };

  return (
    <div className={className}>
      <button 
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={() => setShowModal(true)}
      >
        Add Custom Filter
      </button>
      
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Custom Filter</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field
                </label>
                <select 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                >
                  <option value="">Select Field</option>
                  {availableFields.map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator
                </label>
                <select 
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                >
                  {operatorOptions.map((op) => (
                    <option key={op} value={op}>{operatorLabels[op]}</option>
                  ))}
                </select>
              </div>
              
              {needsValueInput && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input 
                    type="text"
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Enter filter value"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={handleAddFilter}
                disabled={!selectedField || (needsValueInput && !filterValue)}
              >
                Add Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 