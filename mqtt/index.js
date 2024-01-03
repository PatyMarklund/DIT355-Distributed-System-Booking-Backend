const client = require('../mqttClient/')
const {BookingController} = require('../controllers/bookingController') //temporary for testing
const CircuitBreaker = require("opossum");
const bookingFunctions = require("../bookingFunctions")
const {createBooking} = bookingFunctions.controller
const bookingController = new BookingController();

const breakerOptions = {
    timeout: 1000, // If our function takes longer than 1 second, trigger a failure
    errorThresholdPercentage: 10, // When 10% of requests fail, trip the circuit
    resetTimeout: 15000, // After 60 seconds, try again. For demonstrating proposes this might be changed
};
const breaker = new CircuitBreaker(createBooking, breakerOptions);
setInterval(() => {
    for (let i = 1; i <= 4; i++) {
        bookingController.findClinicBookings(i)
    }
}, 3000)
const shared = "$share/A/"
// once connected...
client.on('connect', () => {
  client.subscribe(shared+'booking/create', {qos:2})
  client.subscribe('booking/createTest')
  client.subscribe('booking/createTestHalfOpen')
  client.subscribe(shared+'booking/delete', {qos:2})
  client.subscribe(shared+'booking/sessions/delete', {qos:2})
  client.subscribe(shared+'booking/checkAvailability', {qos:2})
  client.subscribe(shared+'booking/clinicBookings', {qos:2})
  client.subscribe(shared+'booking/search-booking/id/request', {qos:2})
  client.subscribe(shared+'booking/update-booking/id/request', {qos:2})
  client.subscribe(shared+'booking/delete-booking/request', {qos:2})
})

client.on("booking/createTest", async (message) => {
    if (!breaker.opened) {
        const booking = await breaker.fire(message).catch((err) => console.log(err))
        let bookingID = JSON.stringify(booking)
        client.publish('booking/created', bookingID)
    }
})

client.on("booking/createTestHalfOpen", async (message) => {
    const booking = await breaker.fire(message).catch((err) => console.log(err))
    let bookingID = JSON.stringify(booking)
    client.publish('booking/created', bookingID)
})

let open = false;
breaker.fallback(() => {
    if (breaker.opened === true) {
        open = true
    }
})
breaker.on('halfOpen', () => {
    //Publish here to test the circuit breaker
    client.publish('booking/createTestHalfOpen', JSON.stringify({"name": "test"}));
    //breaker.close()
    console.log("Published half Opened")
})
breaker.on('close',  () => {
    if (!open)
        return
    client.publish("frontend/alert", JSON.stringify({
        status: 'close'
    }), {retain: true, qos:2})
    console.log("Published closed")
    open = false
})
breaker.on('open',  () => {
    open = true;
    console.log("Published open")
    client.publish("frontend/alert", JSON.stringify({
        status: 'open'
    }), {retain: true})
})


// display all incoming messages
client.on('message', function(topic, message){
  client.emit(topic, message);
  //console.log("New message " + topic);
  topic = topic.replace("$share/A/", "")
    switch(topic){
        case 'booking/create' :
            console.log("booking created message received " + message.toString());
            bookingController.createBooking(message);
            break;
        case 'booking/delete':
                console.log("Booking to be deleted " + message);
                bookingController.deleteBooking(message);
            break;
        case 'booking/sessions/delete':
              console.log("Session delete request")
              bookingController.deleteSession(message)
            break;
        case 'booking/checkAvailability':
                console.log("Check for availability" + message);
                bookingController.checkAvailability(message);
                break;
            case 'booking/clinicBookings':
                console.log("List all Clinic bookings " + message.toString());
                bookingController.findClinicBookings(message);
                break;
            case 'booking/search-booking/id/request':
                console.log("Booking ID to find " + message);
                bookingController.findBookingByID(message);
                break;
            case 'booking/update-booking/id/request':
                console.log("Booking ID to update " + message);
                bookingController.updateBooking(message);
                break;
            case 'booking/delete-booking/request':
                console.log("Booking ID to delete " + message);
                bookingController.deleteBooking(message);
                break;
            default:
        }
    })


module.exports = client;