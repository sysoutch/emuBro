const path = require('path');

module.exports = {
  entry: './renderer.js',
  output: {
    filename: 'renderer.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  // Keep the legacy renderer compatible with older WebKitGTK builds
                  // used by Linux AppImage environments.
                  targets: {
                    chrome: '90',
                    edge: '90',
                    firefox: '88',
                    safari: '12'
                  },
                  bugfixes: true
                }
              ]
            ]
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              api: 'modern',
              sassOptions: {
                quietDeps: true,
              },
            },
          }
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      }
    ]
  }
};
