// models/collectionMetadataModel.js

const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        const reservedNames = ["__v", "_id", "id", "constructor", "prototype"];
        return !reservedNames.includes(v);
      },
      message: (props) => `${props.value} is a reserved field name.`,
    },
  },
  fieldType: {
    type: String,
    required: true,
    enum: [
      "String",
      "Number",
      "Boolean",
      "Date",
      "Buffer",
      "Mixed",
      "ObjectId",
      "Decimal128",
      "Map",
      "Array",
    ],
  },
  required: { type: Boolean, default: false },
  default: {},
  label: String,
  description: String,
  enumValues: [String],
  min: Number,
  max: Number,
  // Additional options as needed
});

fieldSchema.set("toJSON", { getters: true });
fieldSchema.set("toObject", { getters: true });

const collectionMetadataSchema = new mongoose.Schema(
  {
    collectionName: {
      type: String,
      required: true,
      unique: true,
      match: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    },
    displayName: {
      type: String,
      required: true,
    },
    fields: {
      type: [fieldSchema],
      default: [],
      validate: {
        validator: function (fields) {
          const fieldNames = fields.map((field) => field.fieldName);
          return fieldNames.length === new Set(fieldNames).size;
        },
        message: "Field names must be unique within the collection.",
      },
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CollectionMetadata", collectionMetadataSchema);
