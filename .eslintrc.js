module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'import/export': 'off', // EDS shared scripts intentionally re-export helpers
    'import/no-cycle': 'off', // EDS block/runtime helpers can reference each other
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'max-len': 'off', // DA-authored markup templates are clearer kept inline
    'no-continue': 'off', // content-normalization loops use early continue guards
    'no-inner-declarations': 'off', // block decorators keep tiny render helpers scoped
    'no-nested-ternary': 'off', // preserves compact existing rendering expressions
    'no-underscore-dangle': 'off', // local storage/cache internals use private-style names
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
  },
};
