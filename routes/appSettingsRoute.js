const express = require("express");
const router = express.Router();

const { getNotificationSettings,
        updateNotificationSettings,
        createContactUs
 } = require("../controllers/appSettingsController");

//user     /get notification setting
router.get("/notification-settings/get/:userId", getNotificationSettings);
//user      /update notification setting  
router.put("/notification-settings/update/:userId", updateNotificationSettings);
//user      /Create contact
router.post("/contact-us", createContactUs);

module.exports = router;