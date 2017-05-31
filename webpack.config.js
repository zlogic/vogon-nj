var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    'app': './public/ts/main.ts',
    'polyfills': './public/ts/polyfills.ts'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.join(__dirname, 'public', 'js'),
    filename: '[name].bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
        query: {
          useBabel: true,
          useCache: false,
          babelOptions: {
            presets : [[ 'es2015', { modules: false } ],]
          }
        }
      }
    ]
  },
  plugins: [
    // Workaround for angular/angular#11580
    new webpack.ContextReplacementPlugin(
      /angular(\\|\/)core(\\|\/)@angular/,
      path.join(__dirname, 'public', 'js'),
      {}
    ),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['app', 'polyfills']
    }),
    new webpack.optimize.UglifyJsPlugin({ beautify: false, comments: false })
  ]
};