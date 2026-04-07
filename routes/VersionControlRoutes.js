const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Adjust as needed
const VersionControlController = require('../controllers/VersionControlController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication


const router = express.Router();

router.post('/version/control/add', upload.none(), VersionControlController.addVersion);
// router.post('/version/control/get',upload.none(), VersionControlController.getVersions);
router.post('/check/version',authMiddleware,upload.none(), VersionControlController.checkVersion);
// router.post('/versions/control/status',authMiddleware,upload.none(), VersionControlController.updateStatusById);


module.exports = router;
