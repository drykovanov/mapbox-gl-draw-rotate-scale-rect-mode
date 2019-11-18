const path = require('path');

module.exports = {

    devtool: "source-map",
    mode: 'development',

    entry: [
        './src/index.js'
    ],
    output: {
        // library: 'app',
        // libraryTarget: 'umd',
        libraryTarget: 'var',
        library: 'TxRectMode',
        filename: 'mapbox-gl-draw-rotate-scale-rect-mode.js',
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

    node: {
        // https://github.com/mapbox/mapbox-gl-draw/issues/626
        fs: "empty"
    }
};