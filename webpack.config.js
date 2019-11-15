const path = require('path');

module.exports = {
    mode: 'development',
    context: path.join(__dirname, 'src'),
    entry: './index.js',
    output: {
        filename: 'j.js',
        path: path.join(__dirname, 'dist'),
        publicPath: ''
    },
    devServer: {
        contentBase: path.join(__dirname, 'public')
    }
};
