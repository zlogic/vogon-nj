var path = require('path');
var webpack = require('webpack');
var i18n = require('i18n');
var AngularCompilerPlugin = require('@ngtools/webpack').AngularCompilerPlugin;
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
var ConstDependency = require('webpack/lib/dependencies/ConstDependency');

var env_debug = process.env.NODE_ENV !== "production";

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
        use: env_debug ?
          ['awesome-typescript-loader','angular2-template-loader'] :
          ['@ngtools/webpack']
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
      {
        test: /\.(woff|woff2|[ot]tf|eot)/, loader: 'file-loader?name=fonts/[name].[hash].[ext]?'
      }
    ]
  },
  plugins: [
    // Workaround for angular/angular#11580
    // and for https://github.com/angular/angular/issues/20357#issuecomment-343683491
    new webpack.ContextReplacementPlugin(
      /\@angular(\\|\/)core(\\|\/)esm5/,
      path.resolve(__dirname, 'app'),
      {}
    ),
    new I18nPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: ['app', 'polyfills']
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'ENV': JSON.stringify(process.env.NODE_ENV)
      }
    })
  ]
};

if(!env_debug) {
  //Uglification and optimization only in production
  module.exports.plugins.push(
    new AngularCompilerPlugin({
      tsConfigPath: './tsconfig.json',
      entryModule: path.resolve(__dirname, 'app', 'app.module#AppModule')
    }),
    new webpack.optimize.UglifyJsPlugin({ beautify: false, comments: false }),
    new webpack.LoaderOptionsPlugin({ minimize: true })
  );
}

module.exports.plugins.push(
  new HtmlWebpackPlugin({
    template: 'app/templates/index.pug'
  })
);

module.exports.devServer = {
  contentBase: './app/output',
  proxy: [{
    context: [
      '/configuration', '/oauth', '/service', '/register', '/images',
      '/', '/login', '/transactions', '/accounts', '/analytics', '/usersettings', '/intro'
    ],
    "target": "http://localhost:3000"
  }]
};
