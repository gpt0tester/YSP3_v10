// models/SolrConstant.js
const mongoose = require("mongoose");

const OptionSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const SolrConstantSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["fieldTypeClass", "tokenizer", "filter", "phoneticEncoder"],
      unique: true,
    },
    options: [OptionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SolrConstant", SolrConstantSchema);
