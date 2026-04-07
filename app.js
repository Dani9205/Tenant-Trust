const express = require('express');
require('dotenv').config();
require('./config/db');
require('./models/association');

const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const tenantTrustAuthRoutes = require('./routes/tenantTrustAuthRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const tenantTrustProfileRoutes = require('./routes/profiles/tenantTrustProfileRoutes');
const VersionControlRoutes = require('./routes/VersionControlRoutes');
const propertyRoutes = require('./routes/tenantDashboard/propertyRoutes');
const tenantPaymentRoutes = require('./routes/tenantDashboard/tenantPaymentRoutes');
const BookingProperties = require('./routes/ExploreBookingProperties/BookingProperties');
const propertyRoute = require('./routes/landlordDashboard/propertyRoute');
const propertiesRoutes = require('./routes/properties/propertiesRoutes');
const MaintenanceRoutes = require('./routes/Maintenance/MaintenanceRoutes');
const maintenanceReview = require('./routes/maintenanceReview');
const searchHistoryRoutes = require('./routes/searchHistoryRoutes');
const blockRoutes = require('./routes/blockRoutes');
const ChatController = require('./controllers/ChatController');
const CommentController = require('./controllers/CommentController');


const blogRoutes = require('./routes/blogRoutes');
const imageVideosRoutes = require('./routes/imageVideosRoutes');
const guaranteeLetterRoutes = require('./routes/guaranteeLetterRoutes');
const notificationRoutes = require("./routes/notificationRoutes");



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', tenantTrustProfileRoutes);
app.use('/api', tenantTrustAuthRoutes);
app.use('/api', VersionControlRoutes);
app.use('/api', propertyRoutes);
app.use('/api', tenantPaymentRoutes);
app.use('/api', propertyRoute);
app.use('/api', propertiesRoutes);
app.use('/api', reviewRoutes);
app.use('/api', BookingProperties);
app.use('/api', MaintenanceRoutes);
app.use('/api', maintenanceReview);
app.use('/api', searchHistoryRoutes);
app.use('/api', blockRoutes);
app.use('/api', blogRoutes);
app.use('/api', imageVideosRoutes);
app.use('/api', guaranteeLetterRoutes);
app.use("/api/notifications", notificationRoutes);



// Create HTTP server and bind Socket.IO to it
const server = http.createServer(app);
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  }
});

// Initialize sockets
new ChatController(io);
new CommentController(io);


// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

// Simple health check
app.get('/test', (req, res) => res.status(200).json({ message: 'Server is working!' }));

// IMPORTANT: start the SAME server that has io attached
server.listen(PORT, () => {
  console.log(`HTTP+Socket.IO server running on http://localhost:${PORT}`);
});



// const express = require('express');
// require('dotenv').config();
// require('./config/db');
// require('./models/association');

// const cors = require('cors');
// const http = require('http');
// const { Server } = require('socket.io');
// const path = require('path');

// const tenantTrustAuthRoutes = require('./routes/tenantTrustAuthRoutes');
// const reviewRoutes = require('./routes/reviewRoutes');
// const tenantTrustProfileRoutes = require('./routes/profiles/tenantTrustProfileRoutes');
// const VersionControlRoutes = require('./routes/VersionControlRoutes');
// const propertyRoutes = require('./routes/tenantDashboard/propertyRoutes');
// const tenantPaymentRoutes = require('./routes/tenantDashboard/tenantPaymentRoutes');
// const BookingProperties = require('./routes/ExploreBookingProperties/BookingProperties');
// const propertyRoute = require('./routes/landlordDashboard/propertyRoute');
// const propertiesRoutes = require('./routes/properties/propertiesRoutes');
// const MaintenanceRoutes = require('./routes/Maintenance/MaintenanceRoutes');
// const maintenanceReview = require('./routes/maintenanceReview');
// const searchHistoryRoutes = require('./routes/searchHistoryRoutes');
// const ChatController = require('./controllers/ChatController');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(cors({ origin: '*', methods: ['GET', 'POST'], credentials: true }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use('/uploads', express.static('uploads'));
// app.use(express.static(path.join(__dirname, 'public')));


// // API routes
// app.use('/api', tenantTrustProfileRoutes);
// app.use('/api', tenantTrustAuthRoutes);
// app.use('/api', VersionControlRoutes);
// app.use('/api', propertyRoutes);
// app.use('/api', tenantPaymentRoutes);
// app.use('/api', propertyRoute);
// app.use('/api', propertiesRoutes);
// app.use('/api', reviewRoutes);
// app.use('/api', BookingProperties);
// app.use('/api', MaintenanceRoutes);
// app.use('/api', maintenanceReview);
// app.use('/api', searchHistoryRoutes);

// // Create HTTP server and bind Socket.IO to it
// const server = http.createServer(app);
// const io = new Server(server, {
//   // path: '/socket.io', // default; uncomment if you customize
//   transports: ['websocket', 'polling'],
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST'],
//     credentials: true
//   }
// });

// // Initialize sockets
// new ChatController(io);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// // Serve index.html for the root route
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));

// });

// // Simple health check
// app.get('/test', (req, res) => res.status(200).json({ message: 'Server is working!' }));

// // IMPORTANT: start the SAME server that has io attached
// server.listen(PORT, () => {
//   console.log(`HTTP+Socket.IO server running on http://localhost:${PORT}`);
// });












// const express = require('express');
// const bodyParser = require('body-parser');
// require('dotenv').config(); // Must be at the top of app.js
// require('./config/db'); // Initialize DB connection
// require('./models/association'); // Initialize DB connection
// const cors = require('cors');
// const http = require('http');
// const socketIo = require('socket.io');
// const path = require('path');
// const sequelize = require('./config/db');

// // const path = require('path');
// const tenantTrustAuthRoutes = require('./routes/tenantTrustAuthRoutes'); // Import the careerCare route
// const reviewRoutes = require('./routes/reviewRoutes'); // Import the careerCare route
// const tenantTrustProfileRoutes = require('./routes/profiles/tenantTrustProfileRoutes');
// const VersionControlRoutes = require('./routes/VersionControlRoutes');
// const propertyRoutes = require('./routes/tenantDashboard/propertyRoutes'); // Example
// const tenantPaymentRoutes = require('./routes/tenantDashboard/tenantPaymentRoutes'); // Example
// const BookingProperties = require('./routes/ExploreBookingProperties/BookingProperties'); // Example
// const propertyRoute = require('./routes/landlordDashboard/propertyRoute'); // Example
// const propertiesRoutes = require('./routes/properties/propertiesRoutes'); // Example
// const MaintenanceRoutes = require('./routes/Maintenance/MaintenanceRoutes'); // Example
// const maintenanceReview = require('./routes/maintenanceReview'); // Example
// const searchHistoryRoutes = require('./routes/searchHistoryRoutes'); // Example
// const ChatController = require('./controllers/ChatController');


// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cors());

// const server = http.createServer(app);
// const io = socketIo(server, {
//      transports: ['websocket', 'polling'],
//   cors: {
//     origin: "*", // Allow all origins for testing
//     methods: ["GET", "POST"],
//   },
// });

// const PORT = process.env.PORT || 3000;

// // Middleware
// app.use(bodyParser.json());
// app.use('/uploads', express.static('uploads'));
// app.use(express.static(path.join(__dirname, 'public')));

// // Route for index.html
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Routes
// app.use('/api', tenantTrustProfileRoutes);
// app.use('/api', tenantTrustAuthRoutes); // Assuming you're using /api for your routes
// app.use('/api', VersionControlRoutes); // Assuming you're using /api for your routes
// app.use('/api', propertyRoutes);
// app.use('/api', tenantPaymentRoutes);
// app.use('/api', propertyRoute);
// app.use('/api', propertiesRoutes);
// app.use('/api', reviewRoutes);
// app.use('/api', BookingProperties);
// app.use('/api', MaintenanceRoutes);
// app.use('/api', maintenanceReview);
// app.use('/api', searchHistoryRoutes);


// new ChatController(io);// Initialize OfferController


// // Test route to verify server functionality (GET request)
// app.get('/test', (req, res) => {
//   res.status(200).json({ message: 'Server is working!' });
// });

// // Start server
// server.listen(PORT, () => {
//   console.log(`HTTP+Socket.IO server running on http://localhost:${PORT}`);
// });