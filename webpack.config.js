var path = require('path');
var webpack = require('webpack');
var i18n = require('i18n');
var AotPlugin = require('@ngtools/webpack').AotPlugin;

i18n.configure({
  locales: ['en'],
  directory: __dirname + '/locales'
});

module.exports = {
  entry: {
    'app': './app/main.ts',
    'polyfills': './app/polyfills.ts'
  },
  resolve: {
    alias: {
      views: path.resolve(__dirname, 'app', 'templates/'),
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
        loader: '@ngtools/webpack'
      },
      {
        test: /\.pug$/,
        use: {
          loader: 'pug-static-loader',
          options: {
            pretty: false,
            doctype: 'html',
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
    new AotPlugin({
      tsConfigPath: './tsconfig.json',
      entryModule: path.join(__dirname, 'app', 'app.module#AppModule')
    }),
    new webpack.optimize.UglifyJsPlugin({ beautify: false, comments: false }),
    new webpack.LoaderOptionsPlugin({ minimize: true })
  ]
};