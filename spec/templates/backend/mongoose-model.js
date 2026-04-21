const mongoose = require('mongoose');

const {{MODEL_NAME}}Schema = new mongoose.Schema({
{{SCHEMA_PROPERTIES}}
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

{{SCHEMA_METHODS}}

module.exports = mongoose.model('{{MODEL_NAME}}', {{MODEL_NAME}}Schema);