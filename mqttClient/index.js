const mqtt = require("mqtt");
const credentials = {
    'username': 'team10',
    'password': 'team10',
    'clientId': 'Booking Backend'
}

const client = mqtt.connect("mqtt://localhost:1884", credentials);

module.exports = client;
