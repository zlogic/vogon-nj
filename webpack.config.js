var path = require('path');
var webpack = require('webpack');
var i18n = require('i18n');

i18n.configure({
  locales: ['en'],
  directory: __dirname + '/locales'
});

module.exports = {
  entry: {
    'app': './public/ts/main.ts',
    'polyfills': './public/ts/polyfills.ts'
  },
  resolve: {
    alias: {
      views: path.resolve(__dirname, 'views/'),
    },
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.join(__dirname, 'public', 'js'),
    filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'awesome-typescript-loader',
          options: {
            useBabel: true,
            useCache: false,
            babelOptions: {
              presets: [[ 'es2015', { modules: false } ]]
            }
          }
        }
      },
      {
        test: /\.pug$/,
        use: {
          loader: 'pug-static-loader',
          options: {
            pretty: false,
            locals: {__ : i18n.__}
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