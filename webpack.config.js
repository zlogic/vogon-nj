var path = require('path');
var webpack = require('webpack');
var i18n = require('i18n');
var AotPlugin = require('@ngtools/webpack').AotPlugin;
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
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
        var format = parser.evaluateExpression(expr.arguments[0]).string;
        var result = i18n.__.apply(null, [format]);
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
    extensions: ['.ts', '.js', '.scss']
  },
  output: {
    path: path.resolve(__dirname, 'app', 'output'),
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
        use: [{
            loader: 'apply-loader'
          }, {
            loader: 'pug-loader',
            options: {
              pretty: false,
              doctype: 'html',
              self: {__: i18n.__}
            }
        }]
      },
      {
        test: /\.html$/,
        use: [ {
          loader: 'html-loader',
          options: {
            minimize: true,
            removeComments: true,
            collapseWhitespace: true,

            // angular 2 templates break if these are omitted
            removeAttributeQuotes: false,
            keepClosingSlash: true,
            caseSensitive: true,
            conservativeCollapse: true,
          }
        }],
      },
      {
        test: /\.(css|scss)$/,
        loaders: ['to-string-loader', 'css-loader', {loader: 'sass-loader', options:{includePaths:['node_modules']}}],
      },
      { test: /\.woff$/, loader: 'url-loader?limit=262144&mimetype=application/font-woff' },
      { test: /\.woff2$/, loader: 'url-loader?limit=262144&mimetype=application/font-woff2' },
      { test: /\.[ot]tf$/, loader: 'url-loader?limit=262144&mimetype=application/octet-stream' },
      { test: /\.eot$/, loader: 'url-loader?limit=262144&mimetype=application/vnd.ms-fontobject' }
    ]
  },
  plugins: [
    // Workaround for angular/angular#11580
    new webpack.ContextReplacementPlugin(
      /angular(\\|\/)core(\\|\/)@angular/,
      path.resolve(__dirname, 'public', 'js'),
      {}
    ),
    new I18nPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['app', 'polyfills']
    }),
    new AotPlugin({
      tsConfigPath: './tsconfig.json',
      entryModule: path.resolve(__dirname, 'app', 'app.module#AppModule')
    }),
    new webpack.optimize.UglifyJsPlugin({ beautify: false, comments: false }),
    new webpack.LoaderOptionsPlugin({ minimize: true }),
    new HtmlWebpackPlugin({
      template: 'app/templates/index.pug',
      inlineSource: '.(js)$'
    }),
    new HtmlWebpackInlineSourcePlugin()
  ]
};