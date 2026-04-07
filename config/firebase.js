const admin = require("firebase-admin");
const path = require("path");

// Load the service account key JSON file
const serviceAccount = require(path.join(__dirname, "firebase-service-account.json"));

// Initialize the Firebase app
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
