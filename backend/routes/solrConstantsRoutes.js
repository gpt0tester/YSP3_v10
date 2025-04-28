const express = require("express");
const router = express.Router();
const solrConstantsService = require("../config/solrConstantsService");

// Initialize constants in the database
router.post("/initialize", async (req, res) => {
  try {
    const result = await solrConstantsService.initializeSolrConstants();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all options of a specific type
router.get("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const options = await solrConstantsService.getOptions(type);
    res.status(200).json(options);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all option types and their options
router.get("/", async (req, res) => {
  try {
    const allOptions = await solrConstantsService.getAllOptions();
    res.status(200).json(allOptions);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a new option
router.post("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const newOption = req.body;

    if (!newOption.value || !newOption.label) {
      return res.status(400).json({
        success: false,
        error: "Option must have both value and label",
      });
    }

    const result = await solrConstantsService.addOption(type, newOption);
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(409).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update an existing option
router.put("/:type/:originalValue", async (req, res) => {
  try {
    const { type, originalValue } = req.params;
    const updatedOption = req.body;

    if (!updatedOption.value || !updatedOption.label) {
      return res.status(400).json({
        success: false,
        error: "Option must have both value and label",
      });
    }

    const result = await solrConstantsService.updateOption(
      type,
      originalValue,
      updatedOption
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes("already exists")) {
      return res.status(409).json({ success: false, error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Soft delete an option (mark as inactive)
router.delete("/:type/:value", async (req, res) => {
  try {
    const { type, value } = req.params;
    const result = await solrConstantsService.deleteOption(type, value);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Permanently delete an option
router.delete("/:type/:value/permanent", async (req, res) => {
  try {
    const { type, value } = req.params;
    const result = await solrConstantsService.permanentlyDeleteOption(
      type,
      value
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset options to defaults
router.post("/:type/reset", async (req, res) => {
  try {
    const { type } = req.params;
    const result = await solrConstantsService.resetToDefaults(type);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
