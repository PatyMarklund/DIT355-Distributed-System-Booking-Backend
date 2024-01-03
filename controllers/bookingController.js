var Booking = require('../models/bookings.js');
const client = require('../mqttClient/');
const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const { startSession, endSession, getReservedTimes, timeNotInSession, checkSessions, validateSession, getBookingDetails } = require('./sessionHandler')

class BookingController {
    constructor() {
        // checks sessions every 10 seconds
        const sessionTimer = setInterval(checkSessions, 10000);
    }

    //checks in the database if the booking already exists or not
    async checkAvailability(message){
        console.log('Searching for existing booking')
        const checkBooking = JSON.parse(message);
        const incomingDate = checkBooking.date;
        const incomingClinicID = checkBooking.clinicID;

        const timeAvailable = timeNotInSession(checkBooking)
        console.log("Time Avaiable: " + timeAvailable)
        if (!timeAvailable) {
            console.log("Time not available..");
            client.publish('filter/availability', "false")   //if time not available send a message to the frontend
            return;
        }
        //searches the database if there is a booking already at this specific clinic at this specific date
        await Booking.findOne({clinicID: incomingClinicID, date: incomingDate}).then((res, err) => {
            if (err)
            {
                client.publish('filter/availability', "false",{qos:2})   //if time not available send a message to the frontend
                return null;
            }

            if (res === null) {console.log('booking is available')
            const session = startSession(checkBooking)
            checkBooking.session = session;
            const messageToBook = JSON.stringify(checkBooking)

            client.publish('filter/availability', messageToBook)   //If time available create the booking
            } else {console.log('booking is not available') 
            client.publish('filter/availability', "false")   //if time not available send a message to the frontend
            }
        })
    }

    //Create a new booking
    createBooking(message) {
    //console.log(message.toString())
    const data = JSON.parse(message);
    const bookingDetails = getBookingDetails(data.session);
        if (bookingDetails && data.patient) {
            bookingDetails.patient = data.patient;
            var booking = new Booking(bookingDetails);
            booking.save(function (err, booking) {
                if (err) {
                    //console.log("error " + err)
                    client.publish('filter/bookingstatus', "fail");
                } else {
                    //console.log("Send session id to finish after confirmation " + data.session)
                    endSession(data.session)
                    var bookingID = JSON.stringify(booking._id)
                    //console.log("booking created" + bookingID)
                    client.publish('filter/bookingstatus', bookingID)
                }
            })
        }
        else {
            console.log("No bookingdetails: " + bookingDetails)
            console.log("No patient: " + message);
        }
    } 


    // Cancel reservation session
    deleteSession(message) {
        var sessionID = JSON.parse(message)
        console.log("Deleting session " + sessionID)
        endSession(sessionID)
        client.publish('filter/session/cancel', 'completed')
    }
//Delete booking by booking id
deleteBooking(message) {
    let bookingID = message.slice(1, -1);
    console.log("delete booking " + bookingID);
    try {
        Booking.findOneAndDelete({_id: bookingID}, function(err, booking){
        if (err) {
            console.log("Error deleting booking");
            console.log(err);
        }
        if (!booking) {
                console.log("booking deletion failed")
                client.publish('frontend/delete-booking/reply/' + bookingID + "/not-found", 'Booking does not exist', {qos:2})
        } else {
            console.log("booking deleted successfully")
            console.log(booking)
            client.publish('frontend/delete-booking/reply/' + bookingID + '/succeed', 'Booking is successfully deleted', {qos:2})
        }
        });
    } catch (err) {
        console.error(err);
    }
};

//Find all booking by clinic id
findClinicBookings(message) {
    const arr = []
    const clinicId = message.toString()
    const fikaBreaks = []
    let x = moment(10, "HH:mm");
    for (let i = 0; i < 7; i++){
        x = moment(10, "HH:mm");
        x.add(30, "minutes")
        x.add(i, "day")
        if (x.day() === 6 || x.day() === 0)
            continue
        fikaBreaks.push(x.toLocaleString())
    }
    const lunchBreaks = []
    for (let i = 0; i < 7; i++){
        x = moment(12, "HH:mm");
        x.add(i, "day")
        if (x.day() === 6 || x.day() === 0)
            continue
        lunchBreaks.push(x.toLocaleString())
        x.add(30, "minutes")
        lunchBreaks.push(x.toLocaleString())
    }
    Booking.find({clinicID: clinicId, date: {
        $gte: new Date()
        }}, function(err, booking){
        if(err) {console.log('error: ' + err)}
        if(booking === null){
            console.log("Clinic bookings extraction failed")
        } else { 
            for (let i = 0; i < booking.length; i++) {
                let x = moment(booking[i].date)
                arr.push(x.toLocaleString())
            }
            for (let y = 0; y < fikaBreaks.length; y++){
                arr.push(fikaBreaks[y])
            }
            for (let y = 0; y < lunchBreaks.length; y++){
                arr.push(lunchBreaks[y])
            }
            client.publish (`clinic/clinicBookings/${clinicId}` , JSON.stringify(arr), {qos:2})
        }
    });
};

//Find booking by booking ID in DB
findBookingByID(message) {
    try {
        Booking.findById(message, function(err, booking) {
            if (!booking) {
                console.log("Booking could not be found!!")
                client.publish("frontend/search-booking/id/reply", "Booking could not be found", {qos:2})
            } else {
                console.log("Booking found")
                var bookingInfo = JSON.stringify(booking)
                client.publish("frontend/search-booking/id/reply", bookingInfo, {qos:2})
                console.log(booking)
            }
        });
      } catch (err) {
        console.error(err);
      }
};
//Find booking and update patient
updateBooking(message){
    console.log(JSON.parse(message));
    var updatedBooking = new Booking(JSON.parse(message));
    const updatedBookingJSON = {
        'patient': {
              email: updatedBooking.patient.email,
              firstName: updatedBooking.patient.firstName,
              lastName: updatedBooking.patient.lastName,
              ssn: updatedBooking.patient.ssn
            },
          }
    console.log(updatedBooking._id)
    Booking.findByIdAndUpdate(updatedBooking._id, updatedBookingJSON , {new: true}, function(err, booking){
        if (err) {
            console.log("Error occured" + err)
            client.publish("frontend/update-booking/id/reply/error", "error " + err, {qos:2});
        }
        // If the booking is not found, log a message and publish a message to a topic
        if(booking === null){
            console.log("Booking could not be found")
            client.publish("frontend/update-booking/id/reply/not-found", "Booking could not be found", {qos:2})
        } else {
            // If the booking is found, log a message and save the updated booking
            console.log("Booking updated")
            booking.save();

            // Convert the updated booking to a JSON string and publish it to a topic
            var bookingInfo = JSON.stringify(booking)
            client.publish("frontend/update-booking/id/reply/succeed", bookingInfo, {qos:2})
            console.log(booking)
        }
    })
};
}
module.exports.BookingController = BookingController
