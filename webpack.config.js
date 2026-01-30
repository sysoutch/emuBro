const path = require('path');

module.exports = {
  entry: './renderer.js',
  output: {
    filename: 'renderer.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      }
    ]
  }
};