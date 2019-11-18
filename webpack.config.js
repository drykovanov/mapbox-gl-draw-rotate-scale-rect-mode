const path = require('path');

module.exports = {

    entry: [
        './src/index.js'
    ],
    output: {
        // library: 'app',
        // libraryTarget: 'umd',
        filename: 'tx-rect-mode.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            }
        ]
    },
    watch: true,
};