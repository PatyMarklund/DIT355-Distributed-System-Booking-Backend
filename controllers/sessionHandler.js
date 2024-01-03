// All sessions stored
const sessions = [];
module.exports = {
// Start a new session and place it in the session array.
    startSession: (bookingDetails) => {
        let sessionID
        let expiration = new Date();

        // Set expiration to 5 minutes from now.
        expiration.setSeconds(expiration.getSeconds() + 35);

        // Assign current time since 1970, 01, 01 as a unique ID 
        // Loop if two sessions created exactly at the same time.
        do {
            sessionID = Date.now()
        } while(sessions.some(session => session.session === sessionID))

        // Add sesion to the sessions array
        sessions.push({
            session:sessionID,
            booking: bookingDetails.date,
            clinic: bookingDetails.clinicID,
            expires: expiration
        })

        // return session identifier
        return sessionID
    },

    // Removes a session from the session array if it exists
    endSession: (sessionID) => {
        console.log("Trying to end session " + sessionID)
        let session = sessions.find(booking => booking.session === sessionID)
        // If it exists remove it from array
        if (session) {
            sessions.splice(sessions.indexOf(session), 1)
            console.log("Ending session");
        }else {
            console.log("No session found")
        }
    },

    getBookingDetails: (sessionID) => {
        for (let session of sessions) {
            console.log("Checking if session.session === sessionID" + session.session + " " + sessionID )
            if (session.session.toString() == sessionID.toString())
            {
                return  ({
                    date: session.booking,
                    clinicID: session.clinic,
                })
            }
        }
        return false
    },

    // Returns all reserved time slots by their ID in the array.
    getReservedTimes: () => {
        const bookingID = []
        for (let session of sessions) {
            bookingID.push(session.booking)
        }
        return bookingID
    },

    checkSessions: () => {
  /*      console.log("Session checking...");*/
        var i = sessions.length
        while (i--) {
            if (sessions[i].expires < new Date()) {
                console.log("Removing session...")
                sessions.pop()
            }
        }
    },
    // Check if session is active and if it belongs to user
    validateSession: (sessionID) => {
        let session = sessions.find(session => session === sessionID)
        return session
    },

    timeNotInSession: (bookingDetails) => {
        for (let i = 0; i < sessions.length; i++) {
            if (((sessions[i].booking === bookingDetails.date) && (sessions[i].clinic === bookingDetails.clinicID)))
            {
                return false;
            }
        }
        return true;
    }
}