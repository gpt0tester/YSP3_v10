// services/solrConstantsService.js
const SolrConstant = require("../models/SolrConstant");
const {
  FIELD_TYPE_CLASSES,
  TOKENIZERS,
  FILTER_FACTORIES,
  PHONETIC_ENCODERS,
  DEFAULT_CONSTANTS_MAP,
} = require("../utils/solrFieldTypeConstants");

/**
 * Initialize the database with default values if they don't exist
 */
const initializeSolrConstants = async () => {
  try {
    const constants = [
      {
        type: "fieldTypeClass",
        defaultOptions: FIELD_TYPE_CLASSES,
        name: "Field Type Classes",
      },
      {
        type: "tokenizer",
        defaultOptions: TOKENIZERS,
        name: "Tokenizers",
      },
      {
        type: "filter",
        defaultOptions: FILTER_FACTORIES,
        name: "Filter Factories",
      },
      {
        type: "phoneticEncoder",
        defaultOptions: PHONETIC_ENCODERS,
        name: "Phonetic Encoders",
      },
    ];

    for (const constant of constants) {
      const exists = await SolrConstant.findOne({ type: constant.type });

      if (!exists) {
        console.log(`Initializing ${constant.name} in database...`);
        await SolrConstant.create({
          type: constant.type,
          options: constant.defaultOptions,
        });
      }
    }

    console.log("Solr constants initialized successfully");
    return {
      success: true,
      message: "Solr constants initialized successfully",
    };
  } catch (error) {
    console.error("Error initializing Solr constants:", error);
    throw error;
  }
};

/**
 * Get options by type from database, fall back to constants if DB fails
 */
const getOptions = async (type) => {
  try {
    const result = await SolrConstant.findOne({ type });

    if (result) {
      // Only return active options
      return result.options.filter((option) => option.isActive);
    }

    console.log(`No ${type} options found in DB, using fallback constants`);
    return DEFAULT_CONSTANTS_MAP[type] || [];
  } catch (error) {
    console.error(`Error getting ${type} options:`, error);
    // Fall back to constants if DB query fails
    return DEFAULT_CONSTANTS_MAP[type] || [];
  }
};

/**
 * Get all option types and their options
 */
const getAllOptions = async () => {
  try {
    const types = Object.keys(DEFAULT_CONSTANTS_MAP);
    const result = {};

    for (const type of types) {
      result[type] = await getOptions(type);
    }

    return result;
  } catch (error) {
    console.error("Error getting all options:", error);
    // Fall back to constants
    return DEFAULT_CONSTANTS_MAP;
  }
};

/**
 * Add a new option to a specific type
 */
const addOption = async (type, newOption) => {
  try {
    if (!newOption.value || !newOption.label) {
      throw new Error("Option must have both value and label");
    }

    const constant = await SolrConstant.findOne({ type });

    if (!constant) {
      throw new Error(`Constant type ${type} not found`);
    }

    // Check if option with same value already exists
    const existingOption = constant.options.find(
      (opt) => opt.value === newOption.value
    );

    if (existingOption) {
      // If it exists but is inactive, reactivate it
      if (!existingOption.isActive) {
        existingOption.isActive = true;
        existingOption.label = newOption.label; // Update label in case it changed
        await constant.save();
        return {
          success: true,
          option: existingOption,
          message: "Option reactivated",
        };
      }
      throw new Error(`Option with value ${newOption.value} already exists`);
    }

    // Add new option
    constant.options.push(newOption);
    await constant.save();

    return {
      success: true,
      option: newOption,
      message: "Option added successfully",
    };
  } catch (error) {
    console.error(`Error adding ${type} option:`, error);
    throw error;
  }
};

/**
 * Update an existing option
 */
const updateOption = async (type, originalValue, updatedOption) => {
  try {
    if (!updatedOption.value || !updatedOption.label) {
      throw new Error("Option must have both value and label");
    }

    const constant = await SolrConstant.findOne({ type });

    if (!constant) {
      throw new Error(`Constant type ${type} not found`);
    }

    // If updating to a new value, check if that value already exists
    if (originalValue !== updatedOption.value) {
      const duplicateValue = constant.options.find(
        (opt) => opt.value === updatedOption.value && opt.isActive
      );

      if (duplicateValue) {
        throw new Error(
          `Option with value ${updatedOption.value} already exists`
        );
      }
    }

    // Find the option to update
    const optionIndex = constant.options.findIndex(
      (opt) => opt.value === originalValue && opt.isActive
    );

    if (optionIndex === -1) {
      throw new Error(
        `Option with value ${originalValue} not found or is inactive`
      );
    }

    // Update the option
    constant.options[optionIndex] = {
      ...constant.options[optionIndex],
      value: updatedOption.value,
      label: updatedOption.label,
    };

    await constant.save();

    return {
      success: true,
      option: constant.options[optionIndex],
      message: "Option updated successfully",
    };
  } catch (error) {
    console.error(`Error updating ${type} option:`, error);
    throw error;
  }
};

/**
 * Soft delete an option (mark as inactive)
 */
const deleteOption = async (type, optionValue) => {
  try {
    const constant = await SolrConstant.findOne({ type });

    if (!constant) {
      throw new Error(`Constant type ${type} not found`);
    }

    const optionIndex = constant.options.findIndex(
      (opt) => opt.value === optionValue && opt.isActive
    );

    if (optionIndex === -1) {
      throw new Error(
        `Option with value ${optionValue} not found or is already inactive`
      );
    }

    // Mark as inactive instead of removing
    constant.options[optionIndex].isActive = false;
    await constant.save();

    return { success: true, message: `Option ${optionValue} deactivated` };
  } catch (error) {
    console.error(`Error deleting ${type} option:`, error);
    throw error;
  }
};

/**
 * Permanently delete an option
 */
const permanentlyDeleteOption = async (type, optionValue) => {
  try {
    const constant = await SolrConstant.findOne({ type });

    if (!constant) {
      throw new Error(`Constant type ${type} not found`);
    }

    const initialLength = constant.options.length;
    constant.options = constant.options.filter(
      (opt) => opt.value !== optionValue
    );

    if (constant.options.length === initialLength) {
      throw new Error(`Option with value ${optionValue} not found`);
    }

    await constant.save();

    return {
      success: true,
      message: `Option ${optionValue} deleted permanently`,
    };
  } catch (error) {
    console.error(`Error permanently deleting ${type} option:`, error);
    throw error;
  }
};

/**
 * Reset all options to defaults
 */
const resetToDefaults = async (type) => {
  try {
    if (!DEFAULT_CONSTANTS_MAP[type]) {
      throw new Error(`Invalid type: ${type}`);
    }

    await SolrConstant.findOneAndUpdate(
      { type },
      { options: DEFAULT_CONSTANTS_MAP[type] },
      { upsert: true }
    );

    return { success: true, message: `${type} options reset to defaults` };
  } catch (error) {
    console.error(`Error resetting ${type} options:`, error);
    throw error;
  }
};

module.exports = {
  initializeSolrConstants,
  getOptions,
  getAllOptions,
  addOption,
  updateOption,
  deleteOption,
  permanentlyDeleteOption,
  resetToDefaults,
};
