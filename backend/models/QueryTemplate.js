// models/QueryTemplate.js
const mongoose = require("mongoose");

const QueryTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    qf: {
      type: String,
      default: "",
    },
    fl: {
      type: String,
      default: "",
    },
    pf: {
      type: String,
      default: "",
    },
    pf2: {
      type: String,
      default: "",
    },
    pf3: {
      type: String,
      default: "",
    },
    ps: {
      type: Number,
      default: 0,
    },
    ps2: {
      type: Number,
      default: 0,
    },
    ps3: {
      type: Number,
      default: 0,
    },
    mm: {
      type: String,
      default: "",
    },
    facetFields: {
      type: [String], // an array of strings
      default: [],
    },
    // This flag indicates whether this template is set as default.
    default: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QueryTemplate", QueryTemplateSchema);
