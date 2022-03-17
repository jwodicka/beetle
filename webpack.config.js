const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        // Cytoscape style files can be inlined.
        test: /\.cyss$/i,
        type: 'asset/source',
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Beetle',
    }),
  ],
  devServer: {
    static: './dist',
  },
  mode: 'development',
}