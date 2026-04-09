const Property = require('../models/PropertyModel');
const TenantPayment = require('../models/TenantPayment');
const User = require('../models/User');
// const Chat = require('../models/Chat');
const Review = require('../models/Review');
const BookingRequest = require('../models/BookingRequest');
const FavouriteProperty = require('../models/FavouriteProperty');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const MaintenanceReview = require('../models/MaintenanceReview');
const Chat = require('./Chat');
const Blog = require('./Blog');
const Comment = require('./Comment');
const Notification = require('./Notification');
const GuaranteeLetter = require('./GuaranteeLetter');
const NotificationSettings = require('../models/NotificationSettings');

GuaranteeLetter.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(GuaranteeLetter, { foreignKey: 'userId' });

//get all properties by assigned user id
Property.belongsTo(User, { foreignKey: "userId", as: "landlord" });  // Landlord
Property.belongsTo(User, { foreignKey: "assignedToId", as: "tenant" });  // Tenant


//landlord properties rented and non-rented
TenantPayment.belongsTo(Property, { foreignKey: 'propertyId' });
Property.hasMany(TenantPayment, { foreignKey: 'propertyId' });




//get review by with property detail
Review.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Property.hasMany(Review, { foreignKey: 'propertyId', as: 'reviews' });

// booking request for property for sale and rent
BookingRequest.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
BookingRequest.belongsTo(User, { foreignKey: 'tenantId', as: 'tenant' });


//add favourite
// ✅ Define Associations
FavouriteProperty.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });
FavouriteProperty.belongsTo(Property, { foreignKey: "propertyId", as: "property", onDelete: "CASCADE" });

// MaintenanceReview model should belong to MaintenanceRequest
MaintenanceReview.belongsTo(MaintenanceRequest, { foreignKey: "maintenanceRequestId", as: "maintenanceRequest" });

// If not already defined, also make sure the reverse association exists
MaintenanceRequest.hasOne(MaintenanceReview, { foreignKey: "maintenanceRequestId", as: "maintenanceReview" });


MaintenanceRequest.belongsTo(Property, { foreignKey: "propertyId", as: "property" });
// MaintenanceRequest.belongsTo(User, { foreignKey: "assignedToId", as: "tenant" });
// MaintenanceRequest.belongsTo(User, { foreignKey: "userId", as: "landlord" });




TenantPayment.belongsTo(Property, { foreignKey: "propertyId", as: "property" });
Property.hasMany(TenantPayment, { foreignKey: "propertyId", as: "payments" });


Property.hasMany(TenantPayment, { as: "tenantPayments", foreignKey: "propertyId" });
TenantPayment.belongsTo(Property, { foreignKey: "propertyId" });



User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
// Review.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
// Property.hasMany(Review, { foreignKey: 'propertyId', as: 'reviews' });

// In MaintenanceReview.js
MaintenanceReview.belongsTo(User, { as: 'user', foreignKey: 'userId' });



Property.hasMany(MaintenanceRequest, { foreignKey: 'propertyId' });
MaintenanceRequest.belongsTo(Property, { foreignKey: 'propertyId' });
MaintenanceRequest.belongsTo(User, {
  foreignKey: 'assignedToId',
  as: 'tenant'
});

MaintenanceRequest.belongsTo(User, { as: 'AssignedTo', foreignKey: 'assignedToId' });
User.hasMany(MaintenanceRequest, { foreignKey: 'assignedToId' });

// Define associations after models have been initialized
User.hasMany(Chat, { foreignKey: 'senderId', as: 'Sender' });
User.hasMany(Chat, { foreignKey: 'receiverId', as: 'Receiver' });
Chat.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });
Chat.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });
//block in the chat//
const Block = require('./Block');

Block.belongsTo(User, { foreignKey: 'hisId', as: 'blockedUser' });







// 🔹 Comment belongs to a Blog

Comment.belongsTo(Blog, { foreignKey: 'blogId', as: 'blog', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

Blog.hasMany(Comment, { foreignKey: 'blogId', as: 'comments' });
User.hasMany(Comment, { foreignKey: 'userId', as: 'comments' });




Notification.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Notification.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
module.exports = { User,Chat, Blog, Comment };


//-----------------------------------------------------------------------//
// USER ↔ NOTIFICATION SETTINGS (1:1)
User.hasOne(NotificationSettings, {
  foreignKey: "userId",
  as: "notificationSettings",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

NotificationSettings.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});
//----------------------------------------------------------------------//



// chat system

// const Block = require('./Block');

// User.hasMany(Chat, { foreignKey: 'senderId', as: 'Sender' });
// User.hasMany(Chat, { foreignKey: 'receiverId', as: 'Receiver' });
// Chat.belongsTo(User, { foreignKey: 'senderId', as: 'Sender' });
// Chat.belongsTo(User, { foreignKey: 'receiverId', as: 'Receiver' });

// User.hasMany(Block, { foreignKey: 'myId', as: 'Blocks' });
// Block.belongsTo(User, { foreignKey: 'myId', as: 'Blocker' });
// Block.belongsTo(User, { foreignKey: 'hisId', as: 'Blocked' });

// module.exports = { User, Chat, Block };