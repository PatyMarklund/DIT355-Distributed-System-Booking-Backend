var mongoose = require('mongoose');

var mongoURI = process.env.MONGODB_URI || 'mongodb+srv://Erik:z1Rmty3U70OCZTve@cluster0.lqrjzwy.mongodb.net/nyttTest';
var port = process.env.PORT || 3000;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true }, function(err) {
    if (err) {
        console.error(`Failed to connect to MongoDB with URI: ${mongoURI}`);
        console.error(err.stack);
        process.exit(1);
    }
    console.log(`Connected to MongoDB with URI: ${mongoURI}`);
});

module.exports = mongoose