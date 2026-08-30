module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxRuntime: 'automatic',
          flow: false
        }
      ]
    ],
    plugins: [
      ['@babel/plugin-transform-flow-strip-types', { loose: true }]
    ]
  };
};
