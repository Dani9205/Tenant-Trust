const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, "uploads/");
        } else if (file.mimetype.startsWith("video/")) {
            cb(null, "uploads/videos/");
        } else {
            cb(new Error("Invalid file type"), false);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

module.exports = upload;
