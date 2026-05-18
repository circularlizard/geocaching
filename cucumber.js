module.exports = {
  default: {
    require: ['tests/support/**/*.ts', 'tests/step-definitions/**/*.ts'],
    requireModule: ['tsx'],
    format: ['@cucumber/pretty-formatter'],
    formatOptions: { snippetInterface: 'async-await' },
    paths: ['features/**/*.feature'],
  },
};
