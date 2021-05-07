const path = require('path')

module.exports = {
  lintOnSave: true,
  outputDir: path.resolve(__dirname, '../priv/static'),
  devServer: {
    proxy: 'http://localhost:4000'
  }
  // configureWebpack: {
  //   output: {
  //     path: path.resolve(__dirname, '../priv/static'),
  //   },
  // },
}
