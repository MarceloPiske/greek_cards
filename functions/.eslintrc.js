<<<<<<< HEAD
/* eslint-disable linebreak-style */
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
    "sourceType": "module",
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
<<<<<<< HEAD
    "linebreak-style": ["error", "windows"],
=======
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
