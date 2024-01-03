var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var bookingSchema = new Schema(
    {
        patient: {
            email: {type: String},
            firstName: {type: String}, 
            lastName: {type: String},
            ssn: {type: Number}
        },
        date: {type: Date},
        clinicID: {type: String}
    },
);

module.exports = mongoose.model("bookings", bookingSchema);