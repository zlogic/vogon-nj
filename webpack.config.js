var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    'app': './public/ts/output/newmain.js',
    'polyfills': './public/ts/output/polyfills.js'
  },
  output: {
    path: path.join(__dirname, 'public', 'js'),
    filename: '[name].bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
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
    new webpack.optimize.UglifyJsPlugin({ comments: false })
  ]
};