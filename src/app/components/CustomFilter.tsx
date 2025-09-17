'use client';

import { useState, useEffect } from 'react';

type FilterField = {
  key: string;
  label: string;
  options?: string[]; // For fields with predefined options
};

type FilterOperator = {
  key: string;
  label: string;
};

interface CustomFilterProps {
  availableFields: FilterField[];
  onAddFilter: (field: string, operator: string, value: string | string[]) => void;
  onRemoveFilter: (index: number) => void;
  activeFilters: {field: string, operator: string, value: string | string[]}[];
  className?: string;
  // New props for providing field options
  fieldOptions?: Record<string, string[]>;
}

export default function CustomFilter({
  availableFields,
  onAddFilter,
  onRemoveFilter,
  activeFilters,
  className = '',
  fieldOptions = {}
}: CustomFilterProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('contains');
  const [filterValue, setFilterValue] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<string[]>([]);

  const operatorsByField: Record<string, string[]> = {
    // Default operators for text fields
    default: ['contains', 'does_not_contain', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    // Specific operators for fields with predefined options (multi-select)
    campaign_status: ['is_any_of', 'is_not_any_of', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    upload_status: ['is_any_of', 'is_not_any_of', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    currency: ['is_any_of', 'is_not_any_of', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    bounce_host: ['is_any_of', 'is_not_any_of', 'contains', 'does_not_contain', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    location: ['is_any_of', 'is_not_any_of', 'contains', 'does_not_contain', 'is', 'is_not', 'is_empty', 'is_not_empty'],
    // Date fields
    last_modified: ['is', 'is_not', 'is_empty', 'is_not_empty'],
    created_at: ['is', 'is_not', 'is_empty', 'is_not_empty'],
    // Specific operators for email status
    email_status: ['is', 'is_not', 'is_empty', 'is_not_empty'],
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
      setSelectedValues([]); // Reset multi-select values when field changes
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
    is_not_chain: 'Is not chain',
    is_any_of: 'Is any of',
    is_not_any_of: 'Is not any of'
  };

  const handleAddFilter = () => {
    if (selectedField && selectedOperator) {
      // For "is empty" and "is not empty" operators, we don't need a value
      const needsValue = !['is_empty', 'is_not_empty'].includes(selectedOperator);
      const isMultiSelect = ['is_any_of', 'is_not_any_of'].includes(selectedOperator);
      
      if (!needsValue) {
        // No value needed for empty/not empty operators
        onAddFilter(selectedField, selectedOperator, '');
      } else if (isMultiSelect && selectedValues.length > 0) {
        // Multi-select operators need at least one selected value
        onAddFilter(selectedField, selectedOperator, selectedValues);
      } else if (!isMultiSelect && filterValue) {
        // Single value operators need a value
        onAddFilter(selectedField, selectedOperator, filterValue);
      } else {
        return; // Don't add filter if conditions aren't met
      }
      
      // Reset form
      setSelectedField('');
      setSelectedOperator('contains');
      setFilterValue('');
      setSelectedValues([]);
      setShowModal(false);
    }
  };
  
  const getOperatorLabel = (operatorKey: string) => {
    return operatorLabels[operatorKey] || operatorKey;
  };
  
  const getFieldLabel = (fieldKey: string) => {
    return availableFields.find(f => f.key === fieldKey)?.label || fieldKey;
  };
  
  const needsValueInput = !['is_empty', 'is_not_empty'].includes(selectedOperator);
  const isMultiSelectOperator = ['is_any_of', 'is_not_any_of'].includes(selectedOperator);
  const availableOptions = fieldOptions[selectedField] || [];

  const formatFilterDisplay = (filter: {field: string, operator: string, value: string | string[]}) => {
    const fieldLabel = getFieldLabel(filter.field);
    const operatorKey = filter.operator;
    
    // For empty/not empty operators, we don't need to show the value
    if (operatorKey === 'is_empty' || operatorKey === 'is_not_empty') {
      return `${fieldLabel} ${getOperatorLabel(operatorKey)}`;
    }
    
    // For multi-select operators, format the array values
    if (operatorKey === 'is_any_of' || operatorKey === 'is_not_any_of') {
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      const valueText = values.length > 3 
        ? `${values.slice(0, 3).join(', ')} (+${values.length - 3} more)`
        : values.join(', ');
      return `${fieldLabel} ${getOperatorLabel(operatorKey)} [${valueText}]`;
    }
    
    // For contains operator, format as "Name: Hotel" or "Name contains... Hotel"
    if (operatorKey === 'contains') {
      return `${fieldLabel}: ${filter.value}`;
    }
    
    // For other operators, show the complete format
    return `${fieldLabel} ${getOperatorLabel(operatorKey)} ${filter.value}`;
  };

  // Handle multi-select value changes
  const handleValueToggle = (value: string) => {
    setSelectedValues(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
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
                  {isMultiSelectOperator && availableOptions.length > 0 ? (
                    <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                      {availableOptions.map((option) => (
                        <label key={option} className="flex items-center space-x-2 py-1 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedValues.includes(option)}
                            onChange={() => handleValueToggle(option)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                      {selectedValues.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Selected: {selectedValues.length} item(s)</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input 
                      type="text"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder="Enter filter value"
                    />
                  )}
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
                disabled={!selectedField || (needsValueInput && !isMultiSelectOperator && !filterValue) || (isMultiSelectOperator && selectedValues.length === 0)}
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