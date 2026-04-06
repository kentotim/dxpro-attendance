const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
console.log('MONGODB_URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB接続成功'))
    .catch(err => console.error('MongoDB接続エラー:', err));

module.exports = mongoose;
