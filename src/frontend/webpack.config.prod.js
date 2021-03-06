const path = require('path');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
	entry: {
		// Output multiple files, one for each main page - important!: also include the polyfills in the output bundle
		article: ['./src/utils/enable-polyfills.ts', './src/article.ts'],
		corpora: ['./src/utils/enable-polyfills.ts', './src/corpora.ts'],
		search: ['./src/utils/enable-polyfills.ts', './src/search.ts'],
		'remote-index': ['./src/utils/enable-polyfills.ts', './src/remote-index.ts']
	},
	output: {
		filename: '[name].js',
		// Path on disk for output file
		path: path.resolve(__dirname, 'dist'),
		// Path in webpack-dev-server for compiled files (has priority over disk files in case both exist)
		publicPath: '/dist/',
	},
	resolve: {
		extensions: ['.js', '.ts'], // enable autocompleting .ts and .js extensions when using import '...'
		alias: {
			// Enable importing source files by their absolute path by prefixing with "@/"
			// Note: this also requires typescript to be able to find the imports (though it doesn't use them other than for type checking), see tsconfig.json
			"@": path.join(__dirname, "src"),
		}
	},
	module: {
		// import/exports
		rules: [{
			test: /\.css$/,
			use: [ 'vue-style-loader', 'css-loader'],
		}, {
			test: /\.scss$/,
			use: [
				'vue-style-loader',
				'css-loader',
				'sass-loader'
			]
		}, {
			test: /\.vue$/,
			use: [
				'vue-loader',
			]
		}, {
			test: /\.tsx$/,
			use: [{
				loader: 'babel-loader',
			}, {
				loader: 'ts-loader',
				options: {
					/*
					Required for webpack-dev-server to support HMR (hot module reloading) from typescript files
					This however disables all type checking errors/warnings
					These are then re-enabled through ForkTsCheckerWebpackPlugin
					NOTE: the default behavior is to refresh the entire page on changes in a module
					this can be prevented by adding the following code (essentially manually replacing your imported functions with the updated version):
					But it needs to be done everywhere the module is used, and for every import that you want to update without refreshing the page...
					if (module.hot) {
						module.hot.accept('./exports-string', () => {
							const { valueToLog } = require('./exports-string'); // original imported value doesn't update, so you need to import it again
							document.write(`HMR valueToLog: ${valueToLog}`);
						});
					}
					*/
					transpileOnly: true,
					appendTsxSuffixTo: [/\.vue$/],
				}
			}]
		}, {
			test: /\.ts$/,
			use: [{
				loader: 'babel-loader',
			}, {
				loader: 'ts-loader',
				options: {
					/*
					Required for webpack-dev-server to support HMR (hot module reloading) from typescript files
					This however disables all type checking errors/warnings
					These are then re-enabled through ForkTsCheckerWebpackPlugin
					NOTE: the default behavior is to refresh the entire page on changes in a module
					this can be prevented by adding the following code (essentially manually replacing your imported functions with the updated version):
					But it needs to be done everywhere the module is used, and for every import that you want to update without refreshing the page...
					if (module.hot) {
						module.hot.accept('./exports-string', () => {
							const { valueToLog } = require('./exports-string'); // original imported value doesn't update, so you need to import it again
							document.write(`HMR valueToLog: ${valueToLog}`);
						});
					}
					*/
					transpileOnly: true,
					appendTsSuffixTo: [/\.vue$/],
				}
			}]
		}, {
			test: /\.js$/,
			exclude: [/node_modules/, './src/vendor'],
			loader: 'babel-loader',
		}]
	},
	plugins: [
		// ProvidePlugin makes modules globally available under certain symbols, for both our own files as well as our imported dependencies.
		// This is unfortunately required to allow dependencies to augment other dependencies (such as jquery-ui and bootstrap augmenting jquery)
		// which requires the same instance of jquery to be visible to both the jquery-ui module as our own files
		// NOTE: the exports of these modules are not made available through the window object in the browser!
		// To do that, we need to use the expose-loader.
		new webpack.ProvidePlugin({
			'window.jQuery':    'jquery',
			'jQuery':           'jquery',
			'$':                'jquery',
			'CodeMirror':       'codemirror',
		}),
		new ForkTsCheckerWebpackPlugin({
			vue: true
		}),
		new VueLoaderPlugin(),
		// new BundleAnalyzerPlugin(),
		new CleanWebpackPlugin(['dist'], {
			verbose: false,
		}),
	],
	devtool: 'source-map'
};