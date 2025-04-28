// routes/queryTemplates.js
const express = require("express");
const router = express.Router();
const QueryTemplate = require("../models/QueryTemplate");

// GET /api/query-templates
// Retrieve all query templates, sorted by creation date (newest first)
router.get("/", async (req, res) => {
  try {
    const templates = await QueryTemplate.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/query-templates
// Create a new query template. If the template is marked as default,
// update all other templates to have default=false.
router.post("/", async (req, res) => {
  const {
    name,
    qf,
    fl,
    pf,
    pf2,
    pf3,
    ps,
    ps2,
    ps3,
    mm,
    facetFields,
    default: isDefault,
  } = req.body;

  try {
    if (isDefault) {
      // Remove default flag from all existing templates
      await QueryTemplate.updateMany({}, { default: false });
    }

    const template = new QueryTemplate({
      name,
      qf,
      fl,
      pf,
      pf2,
      pf3,
      ps,
      ps2,
      ps3,
      mm,
      facetFields,
      default: isDefault,
    });

    const newTemplate = await template.save();
    res.status(201).json(newTemplate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Middleware to fetch a template by ID
async function getTemplate(req, res, next) {
  let template;
  try {
    template = await QueryTemplate.findById(req.params.id);
    if (template == null) {
      return res.status(404).json({ message: "Cannot find template" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  res.template = template;
  next();
}

// GET /api/query-templates/:id
// Retrieve a single query template by its ID.
router.get("/:id", getTemplate, (req, res) => {
  res.json(res.template);
});

// PUT /api/query-templates/:id
// Update an existing template. If updated to be default,
// unset the default flag from all others.
router.put("/:id", getTemplate, async (req, res) => {
  const {
    name,
    qf,
    fl,
    pf,
    pf2,
    pf3,
    ps,
    ps2,
    ps3,
    mm,
    facetFields,
    default: isDefault,
  } = req.body;

  if (name != null) res.template.name = name;
  if (qf != null) res.template.qf = qf;
  if (fl != null) res.template.fl = fl;
  if (pf != null) res.template.pf = pf;
  if (pf2 != null) res.template.pf2 = pf2;
  if (pf3 != null) res.template.pf3 = pf3;
  if (ps != null) res.template.ps = ps;
  if (ps2 != null) res.template.ps2 = ps2;
  if (ps3 != null) res.template.ps3 = ps3;
  if (mm != null) res.template.mm = mm;
  if (facetFields != null) res.template.facetFields = facetFields;

  // FIX: Only handle default status if it's explicitly included in the request
  if (isDefault !== undefined) {
    if (isDefault) {
      // Only update other documents if setting this one to default
      await QueryTemplate.updateMany(
        { _id: { $ne: res.template._id } },
        { default: false }
      );
      res.template.default = true;
    } else {
      res.template.default = false;
    }
  }
  // The default status will remain unchanged if not included in the request

  try {
    const updatedTemplate = await res.template.save();
    res.json(updatedTemplate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a template by its ID.
router.delete("/:id", async (req, res) => {
  try {
    const deletedTemplate = await QueryTemplate.findByIdAndDelete(
      req.params.id
    );
    if (!deletedTemplate) {
      return res.status(404).json({ message: "Cannot find template" });
    }

    // If the deleted template was the default, we might want to set another as default
    if (deletedTemplate.default) {
      // Optionally find another template to make default
      // const anotherTemplate = await QueryTemplate.findOne();
      // if (anotherTemplate) {
      //   anotherTemplate.default = true;
      //   await anotherTemplate.save();
      // }
    }

    res.json({ message: "Deleted Template" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/query-templates/:id/default
// Set a specific template as the default template.
// This endpoint unsets the default flag on all other templates.
router.put("/:id/default", async (req, res) => {
  try {
    // Only unset default on OTHER templates (not the current one)
    await QueryTemplate.updateMany(
      { _id: { $ne: req.params.id } },
      { default: false }
    );

    // Set the specified template as default
    const updatedTemplate = await QueryTemplate.findByIdAndUpdate(
      req.params.id,
      { default: true },
      { new: true }
    );

    if (!updatedTemplate) {
      return res
        .status(404)
        .json({ message: "Cannot find template to set default" });
    }

    res.json(updatedTemplate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
