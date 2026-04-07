const { Op, Sequelize } = require('sequelize');
const sequelize = require('../../config/db'); // ✅ correct path to your sequelize instance

const Property = require('../../models/PropertyModel');
const TenantPayment = require('../../models/TenantPayment');
const path = require("path");
const User = require('../../models/User');
const Review = require('../../models/Review');





exports.updateProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findByPk(propertyId);

        if (!property) {
            return res.status(404).json({             success: false,
                message: "Property not found" });
        }

        console.log("Files received:", req.files); // Debugging

        // Handle images
        let imagePaths = property.images ? JSON.parse(property.images) : [];
        if (req.files?.images?.length > 0) {
            imagePaths = req.files.images.map(file => file.filename);
        }

        // Handle video
        let videoPath = property.videoUrl ? property.videoUrl : null;
        if (req.files?.video?.length > 0) {
            videoPath = req.files.video[0].filename;
        }

        // Handle amenities
        let amenitiesArray = typeof req.body.amenities === "string"
            ? req.body.amenities.split(",").map(item => item.trim())
            : req.body.amenities;
        let formattedAmenities = Array.isArray(amenitiesArray) ? amenitiesArray : JSON.parse(property.amenities || "[]");

        // Update Property
        await property.update({
            userId: property.userId,
            title: req.body.title || property.title,
            propertyType: req.body.propertyType || property.propertyType,
            saleOrRent: req.body.saleOrRent || property.saleOrRent,
            paymentFrequency: req.body.paymentFrequency || property.paymentFrequency,
            amount: req.body.amount ? parseFloat(req.body.amount) : property.amount,
            bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : property.bedrooms,
            bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : property.bathrooms,
            startDate: req.body.startDate || property.startDate,
            endDate: req.body.endDate || property.endDate,
            rentDeadline: req.body.rentDeadline || property.rentDeadline,
            location: req.body.location || property.location,
            latitude: req.body.latitude ? parseFloat(req.body.latitude) : property.latitude,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : property.longitude,
            description: req.body.description || property.description,
            amenities: JSON.stringify(formattedAmenities),
            images: JSON.stringify(imagePaths),
            videoUrl: videoPath ? videoPath : property.videoUrl
        });

        // Fetch latest payment for paymentStatus
        const latestPayment = await TenantPayment.findOne({
            where: { propertyId: property.id },
            order: [["createdAt", "DESC"]]
        });

        // Response with parsing logic and paymentStatus
        res.status(200).json({
            success: true,
            message: "Property updated successfully.",
            data: {
                id: property.id,
                userId: property.userId,
                title: property.title,
                propertyType: property.propertyType,
                saleOrRent: property.saleOrRent,
                paymentFrequency: property.paymentFrequency,
                amount: property.amount,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                startDate: property.startDate,
                endDate: property.endDate,
                rentDeadline: property.rentDeadline,
                location: property.location,
                latitude: property.latitude,
                longitude: property.longitude,
                description: property.description,
                images: (() => {
                    try {
                        if (!property.images || property.images === "") return "";
                        const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsedImages = JSON.parse(cleanedImages);
                        return Array.isArray(parsedImages)
                            ? parsedImages.map(image => (typeof image === "string" ? image : image.filename)).filter(Boolean).join(",")
                            : "";
                    } catch (error) {
                        console.error("Error parsing images:", error.message);
                        return "";
                    }
                })(),
                videoUrl: (() => {
                    try {
                        console.log("Raw videoUrl data:", property.videoUrl);
                        if (!property.videoUrl || property.videoUrl === "") {
                            return null;
                        }
    
                        if (typeof property.videoUrl === "string") {
                            const cleanedVideo = property.videoUrl
                                .replace(/^"|"$/g, "")
                                .replace(/\\"/g, '"');
                            console.log("Cleaned videoUrl string:", cleanedVideo);
    
                            // If it’s a JSON object, parse it and return only the filename
                            if (cleanedVideo.startsWith("{")) {
                                const parsedVideo = JSON.parse(cleanedVideo);
                                return parsedVideo.filename ? parsedVideo.filename : null;
                            }
                            return cleanedVideo; // Return plain filename if not JSON
                        }
                        return null;
                    } catch (error) {
                        console.error("Error parsing videoUrl:", error.message);
                        return null;
                    }
                })(),
                amenities: (() => {
                    try {
                        if (!property.amenities || property.amenities === "") return "";
                        const parsedAmenities = JSON.parse(property.amenities);
                        return Array.isArray(parsedAmenities)
                            ? parsedAmenities.map(item => item.replace(/\\+/g, "").replace(/^"|"$/g, "").trim()).filter(Boolean).join(",")
                            : "";
                    } catch (error) {
                        console.error("Error parsing amenities:", error);
                        return "";
                    }
                })(),
                paymentStatus: latestPayment &&
                    (latestPayment.paymentStatus === "On-Time Pay" || latestPayment.paymentStatus === "Late Pay")
                    ? "Paid"
                    : "Unpaid",
                createdAt: property.createdAt,
                updatedAt: property.updatedAt
            }
        });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({
            success: false,
            message: "Error updating property",
            error: err.message
        });
    }
};
exports.getPaymentsByPropertyId = async (req, res) => {
    try {
        const { propertyId } = req.body;

        if (!propertyId) {
            return res.status(400).json({ success: false, message: "Property ID is required." });
        }

        // Fetch payments for the property with a fresh query
        const payments = await TenantPayment.findAll({ 
            where: { propertyId },
            attributes: ['id', 'title', 'rentPaidDate', 'description', 'paymentStatus', 'image', 'propertyId', 'createdAt', 'updatedAt'], // Explicitly select fields
            raw: true, // Ensures the latest values are fetched directly from DB
        });

        if (payments.length === 0) {
            return res.status(404).json({ success: false, message: "No payments found for this property." });
        }

        res.status(200).json({
            success: true,
            message: "Payment history retrieved successfully.",
            data: payments,
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payments.", error: error.message });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId, paymentStatus } = req.body;

        const statusMap = {
            pending: 'Pending',
            onTime: 'On-Time Pay',
            latePay: 'Late Pay'
        };

        const mappedStatus = statusMap[paymentStatus];

        if (!mappedStatus) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status. Allowed values: Pending, On-Time Pay, Late Pay."
            });
        }

        // Find the payment record
        const payment = await TenantPayment.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found."
            });
        }

        // Update payment status
        await payment.update({ paymentStatus: mappedStatus });

        res.status(200).json({
            success: true,
            message: "Payment status updated successfully.",
            data: payment // Returning the full payment object
        });

    } catch (err) {
        console.error("Error updating payment status:", err);
        res.status(500).json({
            success: false,
            message: "Error updating payment status",
            error: err.message
        });
    }
};










// exports.republishProperty = async (req, res) => {
//     try {
//         const { propertyId } = req.body; // Extract the property ID from the request params

//         // Extract userId and userType from the authenticated token
//         const { id: userId, userType } = req.user;

//         // Ensure the user is a landlord
//         if (userType !== "landlord") {
//             return res.status(403).json({
//                 success: false,
//                 message: "Access denied. Only landlords can republish properties."
//             });
//         }

//         // Fetch the property details
//         const property = await Property.findOne({
//             where: {
//                 id: propertyId,
//                 userId, // Ensure the property belongs to the landlord
//             },
//             include: [
//                 {
//                     model: TenantPayment,
//                     required: false, // We don't need this to exist, as some properties may not have payments yet
//                     attributes: ['rentPaidDate', 'paymentStatus'],
//                     order: [['rentPaidDate', 'DESC']], // Get the most recent payment
//                 }
//             ]
//         });

//         if (!property) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Property not found or not owned by the landlord."
//             });
//         }

//         const latestPayment = property.TenantPayments[0]; // Latest payment record (if any)

//         // Check if the payment is overdue based on the property payment frequency
//         if (latestPayment) {
//             const paymentDate = latestPayment.rentPaidDate;
//             const paymentFrequency = property.paymentFrequency;
//             let isOverdue = false;

//             // Determine if the payment date is overdue based on the payment frequency
//             if (paymentFrequency === 'Monthly') {
//                 isOverdue = new Date(paymentDate).getMonth() !== new Date().getMonth(); // Check if last month's payment is past
//             } else if (paymentFrequency === 'Yearly') {
//                 isOverdue = new Date(paymentDate).getFullYear() !== new Date().getFullYear(); // Check if last year's payment is past
//             }

//             if (isOverdue) {
//                 // Update the property to be available again
//                 await property.update({
//                     saleOrRent: 'Sale', // Mark it as not rented
//                     assignedToId: null, // Remove the tenant association
//                     rentDeadline: null, // Reset the rent deadline
//                 });

//                 return res.status(200).json({
//                     success: true,
//                     message: "Property has been republished as available.",
//                     data: property
//                 });
//             }
//         }

//         return res.status(400).json({
//             success: false,
//             message: "Property payment is not overdue or no payments made yet."
//         });
//     } catch (error) {
//         console.error("Error republishing property:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error while republishing the property.",
//             error: error.message
//         });
//     }
// };



exports.getAssignedProperties = async (req, res) => {
    try {
        const { id: userId, userType } = req.user;

        if (userType !== "landlord") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only landlords can fetch assigned properties."
            });
        }

        const assignedProperties = await Property.findAll({
            where: {
                userId, // must belong to this landlord
                assignedToId: { [Op.ne]: null } // must be assigned
            },
            include: [
                {
                    model: User,
                    as: "tenant",
                    attributes: ["id", "name", "image", "address"]
                },
                {
                    model: User,
                    as: "landlord",
                    attributes: ["id", "name", "image", "address"]
                },
                {
                    model: TenantPayment,
                    as: "payments",
                    separate: true,
                    limit: 1,
                    order: [['createdAt', 'DESC']]
                }
            ]
        });

        const formatted = assignedProperties.map(property => {
            const latestPayment = property.payments && property.payments.length > 0 ? property.payments[0] : null;

            return {
                id: property.id,
                title: property.title,
                propertyType: property.propertyType,
                saleOrRent: property.saleOrRent,
                paymentFrequency: property.paymentFrequency,
                amount: property.amount,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                startDate: property.startDate,
                endDate: property.endDate,
                rentDeadline: property.rentDeadline,
                location: property.location,
                latitude: property.latitude,
                longitude: property.longitude,
                createdAt: property.createdAt,
                updatedAt: property.updatedAt,
                description: property.description,

                images: (() => {
                    try {
                        if (!property.images || property.images === "") return "";
                        const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsedImages = JSON.parse(cleanedImages);
                        return Array.isArray(parsedImages)
                            ? parsedImages.map(image => (typeof image === "string" ? image : image.filename)).filter(Boolean).join(",")
                            : "";
                    } catch (error) {
                        console.error("Error parsing images:", error.message);
                        return "";
                    }
                })(),
                videoUrl: (() => {
                    try {
                        if (!property.videoUrl || property.videoUrl === "") return null;
                
                        const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsedVideo = cleanedVideo.startsWith("{") ? JSON.parse(cleanedVideo) : cleanedVideo;
                
                        // If it's an object, return only the filename
                        return typeof parsedVideo === "object" && parsedVideo.filename
                            ? parsedVideo.filename
                            : parsedVideo;
                    } catch (error) {
                        console.error("Error parsing videoUrl:", error.message);
                        return null;
                    }
                })(),
                
                amenities: (() => {
                    try {
                        if (!property.amenities || property.amenities === "") return "";
                
                        let parsed = property.amenities;
                
                        // Try parsing twice if it's a stringified stringified array
                        if (typeof parsed === "string") {
                            parsed = JSON.parse(parsed); // First parse
                        }
                
                        // If it’s still a string like: "Gym, Swimming Pool, Parking"
                        if (typeof parsed === "string" && parsed.includes(',')) {
                            return parsed;
                        }
                
                        // If now it’s an array
                        if (Array.isArray(parsed)) {
                            return parsed.join(", ");
                        }
                
                        return "";
                    } catch (error) {
                        console.error("Error parsing amenities:", error.message, "→ Raw:", property.amenities);
                        return "";
                   }
                })(),
                
                

                landlord: property.landlord,
                tenant: property.tenant,

                paymentStatus: latestPayment &&
                    (latestPayment.paymentStatus === "On-Time Pay" || latestPayment.paymentStatus === "Late Pay")
                    ? "Paid"
                    : "Unpaid",
            };
        });

        return res.status(200).json({
            success: true,
            message: "All assigned properties fetched",
            data: formatted
        });
     } catch (error) {
        console.error("Error fetching assigned properties:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


exports.getUnassignedProperties = async (req, res) => {
    try {
        const { id: userId, userType } = req.user;

        if (userType !== "landlord") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only landlords can fetch unassigned properties."
            });
        }

        const unassignedProperties = await Property.findAll({
            where: {
                userId, // must belong to this landlord
                assignedToId: null // must NOT be assigned
            },
            include: [
                {
                    model: User,
                    as: "landlord",
                    attributes: ["id", "name", "image", "address"]
                }
            ]
        });

        const propertyIds = unassignedProperties.map(p => p.id);

        // Fetch average ratings for the unassigned properties
        const reviews = await Review.findAll({
            attributes: [
                "propertyId",
                [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"]
            ],
            where: {
                propertyId: {
                    [Op.in]: propertyIds
                }
            },
            group: ["propertyId"],
            raw: true
        });

        const ratingsMap = new Map(reviews.map(r => [r.propertyId, parseFloat(r.avgRating).toFixed(1)]));

        const formatted = unassignedProperties.map(property => {
            return {
                id: property.id,
                title: property.title,
                propertyType: property.propertyType,
                saleOrRent: property.saleOrRent,
                paymentFrequency: property.paymentFrequency,
                amount: property.amount,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                startDate: property.startDate,
                endDate: property.endDate,
                rentDeadline: property.rentDeadline,
                location: property.location,
                latitude: property.latitude,
                longitude: property.longitude,
                createdAt: property.createdAt,
                updatedAt: property.updatedAt,
                description: property.description,

                images: (() => {
                    try {
                        if (!property.images || property.images === "") return "";
                        const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsedImages = JSON.parse(cleanedImages);
                        return Array.isArray(parsedImages)
                            ? parsedImages.map(image => (typeof image === "string" ? image : image.filename)).filter(Boolean).join(",")
                            : "";
                    } catch (error) {
                        console.error("Error parsing images:", error.message);
                        return "";
                    }
                })(),

                videoUrl: (() => {
                    try {
                        if (!property.videoUrl || property.videoUrl === "") return null;
                        const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsedVideo = cleanedVideo.startsWith("{") ? JSON.parse(cleanedVideo) : cleanedVideo;
                        return typeof parsedVideo === "object" && parsedVideo.filename
                            ? parsedVideo.filename
                            : parsedVideo;
                    } catch (error) {
                        console.error("Error parsing videoUrl:", error.message);
                        return null;
                    }
                })(),

                amenities: (() => {
                    try {
                        if (!property.amenities || property.amenities === "") return "";
                
                        let parsed = property.amenities;
                
                        // Try parsing if it's a stringified JSON
                        if (typeof parsed === "string") {
                            try {
                                parsed = JSON.parse(parsed);
                            } catch (e) {
                                // If JSON parsing fails, treat it as a simple string (single or CSV)
                                return parsed;
                            }
                        }
                
                        // Handle string or array after parsing
                        if (typeof parsed === "string") return parsed; // Single amenity string
                
                        if (Array.isArray(parsed)) {
                            return parsed.map(item => String(item).trim()).filter(Boolean).join(", ");
                        }
                
                        return "";
                    } catch (error) {
                        console.error("Error parsing amenities:", error.message, "→ Raw:", property.amenities);
                        return "";
                    }
                })(),

                rating: ratingsMap.get(property.id) || null,
                landlord: property.landlord,
                tenant: null,
                paymentStatus: "Unpaid"
            };
        });

        return res.status(200).json({
            success: true,
            message: "All available unassigned properties fetched",
            data: formatted
        });

    } catch (error) {
        console.error("Error fetching unassigned properties:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};





// controller/property.controller.js

exports.republishProperty = async (req, res) => {
    try {
      const { id: landlordId, userType } = req.user;
      const { propertyId } = req.body;
  
      if (userType !== "landlord") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only landlords can republish properties.",
        });
      }
  
      const property = await Property.findOne({
        where: {
          id: propertyId,
          userId: landlordId, // Must be the landlord's property
          assignedToId: { [Op.ne]: null }, // Must be assigned to a tenant
        },
      });
  
      if (!property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or not eligible for republishing.",
        });
      }
  
      // Check if end date is passed
      const now = new Date();
      if (property.endDate && new Date(property.endDate) > now) {
        return res.status(400).json({
          success: false,
          message: "Cannot republish: end date has not yet passed.",
        });
      }
  
      // Unassign tenant
      property.assignedToId = null;
      await property.save();
  
      return res.status(200).json({
        success: true,
        message: "Property republished successfully.",
        data: property,
      });
    } catch (error) {
      console.error("Error in republishProperty:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  };
  



