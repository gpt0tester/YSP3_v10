// backend/utils/solrFieldTypeConstants.js
const FIELD_TYPE_CLASSES = [
  { value: "solr.TextField", label: "TextField (Full-Text)" },
  { value: "solr.StrField", label: "StrField (Exact Match)" },
  { value: "solr.IntPointField", label: "IntPointField (Integer)" },
  { value: "solr.LongPointField", label: "LongPointField (Long)" },
  { value: "solr.DatePointField", label: "DatePointField (Date)" },
  { value: "solr.DoublePointField", label: "DoublePointField (Double)" },
  // ... add more if needed
];

const TOKENIZERS = [
  { value: "solr.StandardTokenizerFactory", label: "StandardTokenizer" },
  { value: "solr.WhitespaceTokenizerFactory", label: "WhitespaceTokenizer" },
  { value: "solr.KeywordTokenizerFactory", label: "KeywordTokenizer" },
  { value: "solr.NGramTokenizerFactory", label: "NGramTokenizerFactory" },
  {
    value: "solr.EdgeNGramTokenizerFactory",
    label: "EdgeNGramTokenizerFactory",
  },
  // ...
];

const FILTER_FACTORIES = [
  { value: "solr.LowerCaseFilterFactory", label: "LowerCaseFilter" },
  {
    value: "solr.TrimFilterFactory",
    label: "TrimFilter",
  },
  {
    value: "solr.ArabicNormalizationFilterFactory",
    label: "ArabicNormalizationFilter",
  },
  {
    value: "solr.ArabicStemFilterFactory",
    label: "ArabicStemFilter",
  },
  { value: "solr.StopFilterFactory", label: "StopFilter" },
  { value: "solr.TypeAsSynonymFilterFactory", label: "TypeAsSynonymFilter" },
  { value: "solr.NGramFilterFactory", label: "NGramFilter" },
  { value: "solr.EdgeNGramFilterFactory", label: "EdgeNGramFilter" },
  { value: "solr.PhoneticFilterFactory", label: "PhoneticFilter" },
  { value: "solr.BeiderMorseFilterFactory", label: "BeiderMorseFilter" },
  {
    value: "solr.DaitchMokotoffSoundexFilterFactory",
    label: "daitchMokotoffSoundex",
  },
  {
    value: "solr.DoubleMetaphoneFilterFactory",
    label: "DoubleMetaphoneFilter",
  },
  // ...
];

const PHONETIC_ENCODERS = [
  { value: "DoubleMetaphone", label: "DoubleMetaphone" },
  { value: "Metaphone", label: "Metaphone" },
  { value: "Soundex", label: "Soundex" },
  { value: "RefinedSoundex", label: "RefinedSoundex" },
  { value: "Caverphone", label: "Caverphone" },
  { value: "ColognePhonetic", label: "ColognePhonetic" },
  { value: "Nysiis", label: "Nysiis" },
  // ...
];

// Map constant types to their default values
const DEFAULT_CONSTANTS_MAP = {
  fieldTypeClass: FIELD_TYPE_CLASSES,
  tokenizer: TOKENIZERS,
  filter: FILTER_FACTORIES,
  phoneticEncoder: PHONETIC_ENCODERS,
};

module.exports = {
  FIELD_TYPE_CLASSES,
  TOKENIZERS,
  FILTER_FACTORIES,
  PHONETIC_ENCODERS,
  DEFAULT_CONSTANTS_MAP,
};
