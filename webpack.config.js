var path = require('path');
var webpack = require('webpack');
var i18n = require('i18n');
var AotPlugin = require('@ngtools/webpack').AotPlugin;
var ConstDependency = require('webpack/lib/dependencies/ConstDependency');

i18n.configure({
  locales: ['en'],
  directory: __dirname + '/locales'
});

function I18nPlugin() { }

I18nPlugin.prototype.apply = function(compiler) {
  compiler.plugin("compilation", function(compilation, data) {
    data.normalModuleFactory.plugin("parser", function(parser, options) {
      parser.plugin("call __", function (expr) {
        var args = expr.arguments.map(function(argument) { return parser.evaluateExpression(argument).string; });
        var result = i18n.__.apply(null, args);
        const dep = new ConstDependency(JSON.stringify(result), expr.range);
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        return true;
      });
    });
  });
};


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
    new I18nPlugin(),
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