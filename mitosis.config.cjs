/** @type {import('@builder.io/mitosis').MitosisConfig} */
module.exports = {
  files: 'components/**/*',
  targets: ['vue', 'react'],
  dest: 'packages',
  getTargetPath: ({ target }) => `${target}/src/generated`,
  commonOptions: { typescript: true },
  parserOptions: { jsx: { tsConfigFilePath: 'tsconfig.mitosis.json' } },
  options: {
    vue: { api: 'composition' },
  },
};
