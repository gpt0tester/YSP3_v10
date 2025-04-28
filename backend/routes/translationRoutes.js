const express = require("express");
const router = express.Router();
const Translation = require("../models/Translation.js");

// GET /api/translations
// Returns all translations in the DB
router.get("/", async (req, res) => {
  try {
    const translations = await Translation.find();
    res.json(translations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/translations
// Creates a new translation
router.post("/", async (req, res) => {
  const { key, language, value } = req.body;
  try {
    const newTranslation = new Translation({ key, language, value });
    await newTranslation.save();
    res.status(201).json(newTranslation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/translations/:id
// Updates an existing translation
router.put("/:id", async (req, res) => {
  const { key, language, value } = req.body;
  try {
    const updatedTranslation = await Translation.findByIdAndUpdate(
      req.params.id,
      { key, language, value },
      { new: true }
    );
    if (!updatedTranslation) {
      return res.status(404).json({ error: "Translation not found" });
    }
    res.json(updatedTranslation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/translations/:id
// (Optional) Deletes a translation
router.delete("/:id", async (req, res) => {
  try {
    const deletedTranslation = await Translation.findByIdAndDelete(
      req.params.id
    );
    if (!deletedTranslation) {
      return res.status(404).json({ error: "Translation not found" });
    }
    res.json({ message: "Translation deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
