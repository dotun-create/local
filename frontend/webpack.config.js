const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = (_, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;
  const shouldAnalyze = process.env.ANALYZE === 'true';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/bundle.js',
      chunkFilename: isProduction ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
      assetModuleFilename: 'static/media/[name].[hash][ext]',
      publicPath: '/',
      clean: true,
    },
    devServer: isDevelopment ? {
      static: {
        directory: path.join(__dirname, 'build'),
      },
      compress: true,
      port: 3000,
      historyApiFallback: true,
      hot: true,
      proxy: [
        {
          context: ['/api'],
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        }
      ],
    } : undefined,
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/media/[name].[hash:8][ext]'
          },
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024 // 8kb
            }
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/fonts/[name].[hash:8][ext]'
          }
        },
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        inject: true,
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        } : false,
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(process.env),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL),
      }),
      ...(isProduction ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        }),
      ] : []),
      ...(shouldAnalyze ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html',
        }),
      ] : [])
    ],
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@features': path.resolve(__dirname, 'src/features'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@config': path.resolve(__dirname, 'src/config'),
        '@utils': path.resolve(__dirname, 'src/shared/utils'),
        '@hooks': path.resolve(__dirname, 'src/shared/hooks'),
        '@services': path.resolve(__dirname, 'src/shared/services'),
        '@store': path.resolve(__dirname, 'src/shared/store'),
        '@styles': path.resolve(__dirname, 'src/shared/styles'),
        '@theme': path.resolve(__dirname, 'src/shared/theme'),
        // Feature aliases
        '@auth': path.resolve(__dirname, 'src/features/auth'),
        '@courses': path.resolve(__dirname, 'src/features/courses'),
        '@dashboard': path.resolve(__dirname, 'src/features/dashboard'),
        '@payments': path.resolve(__dirname, 'src/features/payments'),
        '@calendar': path.resolve(__dirname, 'src/features/calendar'),
        '@notifications': path.resolve(__dirname, 'src/features/notifications'),
        '@admin': path.resolve(__dirname, 'src/features/admin'),
        '@quiz': path.resolve(__dirname, 'src/features/quiz'),
        '@learning': path.resolve(__dirname, 'src/features/learning'),
        '@chat': path.resolve(__dirname, 'src/features/chat'),
        '@billing': path.resolve(__dirname, 'src/features/billing'),
      }
    },
    optimization: isProduction ? {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 10,
        maxAsyncRequests: 10,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 15,
          },
          styledComponents: {
            test: /[\\/]node_modules[\\/]styled-components[\\/]/,
            name: 'styled-components',
            chunks: 'all',
            priority: 12,
          },
          shared: {
            test: /[\\/]src[\\/]shared[\\/]/,
            name: 'shared',
            chunks: 'all',
            priority: 10,
            minChunks: 2,
          },
          theme: {
            test: /[\\/]src[\\/]shared[\\/](theme|styles)[\\/]/,
            name: 'theme',
            chunks: 'all',
            priority: 8,
          },
          auth: {
            test: /[\\/]src[\\/]features[\\/]auth[\\/]/,
            name: 'auth',
            chunks: 'all',
            priority: 5,
          },
          courses: {
            test: /[\\/]src[\\/]features[\\/]courses[\\/]/,
            name: 'courses',
            chunks: 'all',
            priority: 5,
          },
          dashboard: {
            test: /[\\/]src[\\/]features[\\/]dashboard[\\/]/,
            name: 'dashboard',
            chunks: 'all',
            priority: 5,
          },
          payments: {
            test: /[\\/]src[\\/]features[\\/]payments[\\/]/,
            name: 'payments',
            chunks: 'all',
            priority: 5,
          },
          learning: {
            test: /[\\/]src[\\/]features[\\/](quiz|learning)[\\/]/,
            name: 'learning',
            chunks: 'all',
            priority: 5,
          },
          admin: {
            test: /[\\/]src[\\/]features[\\/]admin[\\/]/,
            name: 'admin',
            chunks: 'all',
            priority: 5,
          },
          default: {
            minChunks: 2,
            priority: 1,
            reuseExistingChunk: true,
          },
        },
      },
      runtimeChunk: {
        name: 'runtime',
      },
      minimize: true,
      usedExports: true,
      sideEffects: false,
    } : {
      splitChunks: {
        chunks: 'all',
      },
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
  };
};