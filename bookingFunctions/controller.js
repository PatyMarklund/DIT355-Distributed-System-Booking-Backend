var Booking = require('../models/bookings.js');
const createBooking = async (message) => {
    message = message.toString()
    message = JSON.parse(message)
    let booking = new Booking((message));
    await booking.save()
    return booking
}

module.exports = {createBooking: createBooking}