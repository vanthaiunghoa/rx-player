/* eslint-env node */

const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const webpack = require("webpack");
const shouldMinify = !!process.env.RXP_MINIFY;

const plugins = [
  new webpack.DefinePlugin({
    "__FEATURES__": {
      SMOOTH: false,
      DASH: false,
      DIRECTFILE: false,
      NATIVE_TTML: false,
      NATIVE_SAMI: false,
      NATIVE_VTT: false,
      NATIVE_SRT: false,
      HTML_TTML: false,
      HTML_SAMI: false,
      HTML_VTT: false,
      HTML_SRT: false,
      EME: false,
      BIF: false,
    },
    __DEV__: false,
    __LOGGER_LEVEL__: "\"DEBUG\"",
    "process.env": {
      NODE_ENV: "production",
    },
  }),
];

module.exports = {
  mode: "production",
  entry: {
    "bif_parser": "./src/features/list/bif_parser.ts",
    "dash": "./src/features/list/dash.ts",
    "directfile": "./src/features/list/directfile.ts",
    "eme": "./src/features/list/eme.ts",
    "html_sami_parser": "./src/features/list/html_sami_parser.ts",
    "html_srt_parser": "./src/features/list/html_srt_parser.ts",
    "html_text_buffer": "./src/features/list/html_text_buffer.ts",
    "html_ttml_parser": "./src/features/list/html_ttml_parser.ts",
    "html_vtt_parser": "./src/features/list/html_vtt_parser.ts",
    "image_buffer": "./src/features/list/image_buffer.ts",
    "native_sami_parser": "./src/features/list/native_sami_parser.ts",
    "native_srt_parser": "./src/features/list/native_srt_parser.ts",
    "native_text_buffer": "./src/features/list/native_text_buffer.ts",
    "native_ttml_parser": "./src/features/list/native_ttml_parser.ts",
    "native_vtt_parser": "./src/features/list/native_vtt_parser.ts",
    "smooth": "./src/features/list/smooth.ts",
  },
  output: {
    libraryTarget: "commonjs",
    filename: shouldMinify ? "../features/minified/[name].min.js" : "../features/standard/[name].js",
  },
  optimization: {
    minimizer: shouldMinify ? [new UglifyJsPlugin()] : [
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: { keep_infinity: true },
          keep_fnames: true,
          keep_classnames: true,
          keep_fargs: true,
          mangle: false,
          output: {
            beautify: true,
            comments: true,
          },
        },
      }),
    ],
  },
  performance: {
    maxEntrypointSize: shouldMinify ? 400000 : 1500000,
    maxAssetSize: shouldMinify ? 400000 : 1500000,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              presets: [
                [ "es2015", { loose: true, modules: false } ],
                "es2016",
                "es2017",
              ],
            },
          },
          { loader: "ts-loader" },
        ],
      },
    ],
  },
  plugins,
  node: {
    console: false,
    global: true,
    process: false,
    Buffer: false,
    __filename: false,
    __dirname: false,
    setImmediate: false,
  },
};
