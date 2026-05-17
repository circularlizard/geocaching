module.exports = {
  default: {
    require: ['tests/step-definitions/**/*.ts'],
    requireModule: ['tsx'],
    format: ['@cucumber/pretty-formatter'],
    formatOptions: { snippetInterface: 'async-await' },
    paths: ['features/**/*.feature'],
  },
};
