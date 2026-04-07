const { Op } = require('sequelize');
const sequelize = require('../../config/db'); // ✅ correct path to your sequelize instance
const BookingRequest = require('../../models/BookingRequest');
const Property = require('../../models/PropertyModel');
const User = require('../../models/User');
const TenantPayment = require('../../models/TenantPayment');
const Review = require('../../models/Review');
const FavouriteProperty = require("../../models/FavouriteProperty");


exports.createBookingRequest = async (req, res) => {
    try {
        const { tenantId, propertyId } = req.body;

        // Check if the property exists
        const property = await Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // Check if a booking request already exists and is approved
        const approvedRequest = await BookingRequest.findOne({
            where: { propertyId, requestStatus: 'Approved' }
        });

        if (approvedRequest) {
            return res.status(400).json({ success: false, message: 'This property already has an approved booking request' });
        }

        // Check if the tenant has already made a request to this property
        const tenantRequestExists = await BookingRequest.findOne({
            where: { propertyId, tenantId }
        });

        if (tenantRequestExists) {
            return res.status(400).json({
                success: false,
                message: 'You have already made a booking request for this property'
            });
        }

        // Create booking request
        const bookingRequest = await BookingRequest.create({
            tenantId,
            propertyId
        });

        // Fetch the newly created booking request with property and tenant details
        const bookingDetails = await BookingRequest.findByPk(bookingRequest.id, {
            include: [
                { model: Property, as: 'property' },
                {
                    model: User,
                    as: 'tenant',
                    attributes: { exclude: ['password', 'otpExpiry', 'otp'] }
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Booking request created successfully',
            data: bookingDetails
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating booking request', error: error.message });
    }
};





exports.getAvailableProperties = async (req, res) => {
    try {
        const userId = req.user.id;
        const { propertyType } = req.query;

        const whereCondition = { assignedToId: null };
        if (propertyType) {
            whereCondition.propertyType = propertyType;
        }

        const availableProperties = await Property.findAll({
            where: whereCondition,
            raw: true
        });

        const propertyIds = availableProperties.map(p => p.id);

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

        const favouriteProps = await FavouriteProperty.findAll({
            where: { userId },
            attributes: ["propertyId"],
            raw: true
        });

        const favouriteIds = new Set(favouriteProps.map(fav => fav.propertyId));

        const bookingRequests = await BookingRequest.findAll({
            where: {
                tenantId: userId
            },
            attributes: ["propertyId"],
            raw: true
        });

        const requestedIds = new Set(bookingRequests.map(req => req.propertyId));

        const formattedProperties = await Promise.all(
            availableProperties.map(async property => {
                const latestBooking = await BookingRequest.findOne({
                    where: { propertyId: property.id },
                    order: [['createdAt', 'DESC']]
                });

                const bookingStatus = latestBooking ? latestBooking.requestStatus : '';

                const images = (() => {
                    try {
                        if (!property.images) return "";
                        const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsedImages = JSON.parse(cleanedImages);
                        return Array.isArray(parsedImages)
                            ? parsedImages.map(img => (typeof img === "string" ? img : img.filename)).filter(Boolean).join(", ")
                            : "";
                    } catch {
                        return "";
                    }
                })();

                const videoUrl = (() => {
                    try {
                        if (!property.videoUrl) return null;
                        const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                        const parsed = cleanedVideo.startsWith("{") ? JSON.parse(cleanedVideo) : cleanedVideo;
                        return typeof parsed === "object" && parsed.filename ? parsed.filename : parsed;
                    } catch {
                        return null;
                    }
                })();

                const amenities = (() => {
                    try {
                        const raw = property.amenities;
                        if (!raw || raw === "") return "";

                        let parsed = raw;

                        if (typeof raw === "string") {
                            try {
                                parsed = JSON.parse(raw);
                            } catch {
                                return raw.split(",").map(item => item.trim()).filter(Boolean).join(", ");
                            }
                        }

                        if (Array.isArray(parsed)) {
                            return parsed.map(item => String(item).trim()).filter(Boolean).join(", ");
                        }

                        return String(parsed);
                    } catch {
                        return "";
                    }
                })();

                return {
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
                    rating: ratingsMap.get(property.id) || null,
                    favStatus: favouriteIds.has(property.id),
                    requested: requestedIds.has(property.id),
                    images,
                    videoUrl,
                    bookingStatus,
                    amenities,
                    paymentStatus: "Unpaid",
                    createdAt: property.createdAt,
                    updatedAt: property.updatedAt
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: `Available ${propertyType || ""} properties fetched successfully`,
            data: formattedProperties
        });

    } catch (error) {
        console.error(`Error fetching available ${req.query.propertyType || "unknown"} properties:`, error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};








exports.toggleFavouriteProperty = async (req, res) => {
    try {
        const { userId, propertyId } = req.body;

        // Ensure user is a tenant
        const user = await User.findOne({ where: { id: userId, userType: "tenant" } });
        if (!user) {
            return res.status(403).json({ success: false, message: "Only tenants can favorite properties" });
        }

        // Fetch property
        const property = await Property.findOne({ where: { id: propertyId }, raw: true });
        if (!property) {
            return res.status(404).json({ success: false, message: "Property not found" });
        }

        // Get latest booking request for this property
        const latestBooking = await BookingRequest.findOne({
            where: { propertyId },
            order: [['createdAt', 'DESC']]
        });
        const bookingStatus = latestBooking ? latestBooking.requestStatus : '';

        // Process images
        const images = (() => {
            try {
                if (!property.images || property.images === "") return "";
                const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                const parsedImages = JSON.parse(cleanedImages);
                return Array.isArray(parsedImages)
                    ? parsedImages.map(img => (typeof img === "string" ? img : img.filename)).filter(Boolean).join(",")
                    : "";
            } catch {
                return "";
            }
        })();

        // Process videoUrl
        const videoUrl = (() => {
            try {
                if (!property.videoUrl || property.videoUrl === "") return null;
                const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                const parsedVideo = cleanedVideo.startsWith("{") ? JSON.parse(cleanedVideo) : cleanedVideo;
                return typeof parsedVideo === "object" && parsedVideo.filename ? parsedVideo.filename : parsedVideo;
            } catch {
                return null;
            }
        })();

        // Process amenities
        const amenities = (() => {
            try {
                if (!property.amenities || property.amenities === "") return "";
                let parsed = property.amenities;
                if (typeof parsed === "string") {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch {
                        return parsed.split(",").map(item => item.trim()).filter(Boolean).join(", ");
                    }
                }
                if (Array.isArray(parsed)) {
                    return parsed.map(item => String(item).trim()).filter(Boolean).join(", ");
                }
                return String(parsed);
            } catch {
                return "";
            }
        })();

        // Prepare formatted object
        const formatted = {
            favStatus: false, // default
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
            images,
            videoUrl,
            amenities,
            paymentStatus: "Unpaid",
            bookingStatus,
            createdAt: property.createdAt,
            updatedAt: property.updatedAt
        };

        // Check if already favorited
        const existingFav = await FavouriteProperty.findOne({ where: { userId, propertyId } });

        if (existingFav) {
            await existingFav.destroy();
            formatted.favStatus = false;
            return res.json({
                success: true,
                message: "Property removed from favorites",
                data: formatted
            });
        } else {
            await FavouriteProperty.create({ userId, propertyId });
            formatted.favStatus = true;
            return res.json({
                success: true,
                message: "Property added to favorites",
                data: formatted
            });
        }

    } catch (error) {
        console.error("Error toggling favorite:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};




exports.getFavouriteProperties = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await User.findOne({ where: { id: userId, userType: "tenant" } });
        if (!user) {
            return res.status(403).json({ success: false, message: "Only tenants can view favorite properties" });
        }

        const favourites = await FavouriteProperty.findAll({
            where: { userId },
            include: [{
                model: Property,
                as: "property",
                required: true
            }],
            raw: true,
            nest: true
        });

        const propertyIds = favourites.map(fav => fav.property.id);

        // Get latest booking statuses
        const bookings = await BookingRequest.findAll({
            where: { propertyId: { [Op.in]: propertyIds } },
            order: [['createdAt', 'DESC']],
            raw: true
        });

        const bookingMap = new Map();
        for (const booking of bookings) {
            if (!bookingMap.has(booking.propertyId)) {
                bookingMap.set(booking.propertyId, booking.requestStatus);
            }
        }

        const formattedFavourites = favourites.map(fav => {
            const property = fav.property;

            const images = (() => {
                try {
                    if (!property.images) return "";
                    const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                    const parsedImages = JSON.parse(cleanedImages);
                    return Array.isArray(parsedImages)
                        ? parsedImages.map(img => (typeof img === "string" ? img : img.filename)).filter(Boolean).join(", ")
                        : "";
                } catch {
                    return "";
                }
            })();

             const videoUrl = (() => {
            try {
                if (!property.videoUrl || property.videoUrl === "") return null;
                const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                const parsedVideo = cleanedVideo.startsWith("{") ? JSON.parse(cleanedVideo) : cleanedVideo;
                return typeof parsedVideo === "object" && parsedVideo.filename ? parsedVideo.filename : parsedVideo;
            } catch {
                return null;
            }
        })();

            const amenities = (() => {
            try {
                if (!property.amenities || property.amenities === "") return "";
                let parsed = property.amenities;
                if (typeof parsed === "string") {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch {
                        return parsed.split(",").map(item => item.trim()).filter(Boolean).join(", ");
                    }
                }
                if (Array.isArray(parsed)) {
                    return parsed.map(item => String(item).trim()).filter(Boolean).join(", ");
                }
                return String(parsed);
            } catch {
                return "";
            }
        })();

            return {
                favStatus: true,
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
                images,
                videoUrl,
                amenities,
                paymentStatus: "Unpaid",
                bookingStatus: bookingMap.get(property.id) || "",
                createdAt: property.createdAt,
                updatedAt: property.updatedAt
            };
        });

        return res.status(200).json({
            success: true,
            message: "Favourite properties fetched successfully",
            data: formattedFavourites
        });

    } catch (error) {
        console.error("Error fetching favourite properties:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




exports.updateBookingRequest = async (req, res) => {
    try {
        console.log("Request Body:", req.body); // Debugging

        const { requestId, requestStatus } = req.body;
        console.log("Extracted requestId:", requestId); // Debugging

        if (!requestId) {
            return res.status(400).json({ message: "requestId is required" });
        }

        const bookingRequest = await BookingRequest.findByPk(requestId);
        if (!bookingRequest) {
            return res.status(404).json({ success: false,  message: `Booking request with ID ${requestId} not found` });
        }

        if (!['Pending', 'Approved', 'Rejected'].includes(requestStatus)) {
            return res.status(400).json({ success: false,  message: 'Invalid request status' });
        }

        // Update request status
        await bookingRequest.update({ requestStatus });

        // If approved, update property.assignedToId to the tenantId
        if (requestStatus === 'Approved') {
            console.log("Approving request and updating assignedToId");

            const property = await Property.findByPk(bookingRequest.propertyId);
            if (property) {
                await property.update({ assignedToId: bookingRequest.tenantId });
            }
        }

        // Fetch updated booking request details with property and tenant information
        const updatedBookingDetails = await BookingRequest.findByPk(requestId, {
            include: [
                { model: Property, as: 'property' }, // Match alias defined in model
                { 
                    model: User, 
                    as: 'tenant', 
                    attributes: { exclude: ['password', 'otpExpiry', 'otp'] } // Exclude sensitive fields
                }
            ]
        });

        res.json({
            success: true,
            message: 'Booking request updated successfully',
            data: updatedBookingDetails
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating booking request', error: error.message });
    }
};


exports.getAvailablePropertiesByType = async (req, res) => {
    const { propertyType } = req.body;
    const userId = req.user?.id;

    try {
        if (!propertyType) {
            return res.status(400).json({
                success: false,
                message: "propertyType parameter is required"
            });
        }

        const availableProperties = await Property.findAll({
            where: {
                propertyType,
                assignedToId: null // Only unassigned properties
            },
            raw: true
        });

        const reviews = await Review.findAll({
            attributes: [
                "propertyId",
                [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"]
            ],
            group: ["propertyId"],
            raw: true
        });
        const ratingsMap = new Map(reviews.map(r => [r.propertyId, parseFloat(r.avgRating).toFixed(1)]));

        const favouriteProps = await FavouriteProperty.findAll({
            where: { userId },
            attributes: ["propertyId"],
            raw: true
        });
        const favouriteIds = new Set(favouriteProps.map(fav => fav.propertyId));

        const formattedProperties = availableProperties.map(property => ({
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
            rating: ratingsMap.get(property.id) || null,
            favStatus: favouriteIds.has(property.id),
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
                    let amenitiesData = property.amenities;
                    if (typeof amenitiesData === "string") {
                        while (amenitiesData.startsWith('"') && amenitiesData.endsWith('"')) {
                            amenitiesData = amenitiesData
                                .replace(/^"|"$/g, "")
                                .replace(/\\+/g, "")
                                .replace(/""/g, '"');
                        }
                        let parsedAmenities;
                        try {
                            parsedAmenities = JSON.parse(amenitiesData);
                            while (typeof parsedAmenities === "string") {
                                parsedAmenities = JSON.parse(parsedAmenities);
                            }
                        } catch (e) {
                            return amenitiesData.split(",").map(item => item.trim()).filter(Boolean).join(",");
                        }
                        const result = Array.isArray(parsedAmenities)
                            ? parsedAmenities.map(item => String(item).replace(/\\+/g, "").replace(/^"|"$/g, "").trim()).filter(Boolean).join(",")
                            : String(parsedAmenities).trim();
                        return result;
                    }
                    if (Array.isArray(amenitiesData)) {
                        return amenitiesData.map(item => String(item).replace(/\\+/g, "").replace(/^"|"$/g, "").trim()).filter(Boolean).join(",");
                    }
                    return "";
                } catch (error) {
                    console.error("Error parsing amenities:", error.message);
                    return "";
                }
            })(),
            paymentStatus: "Unpaid", // Optional: You can remove or customize this
            createdAt: property.createdAt,
            updatedAt: property.updatedAt
        }));

        return res.status(200).json({
            success: true,
            message: `Available ${propertyType} properties fetched successfully`,
            data: formattedProperties
        });

    } catch (error) {
        console.error(`Error fetching available ${propertyType || "unknown"} properties:`, error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};





exports.getAvailablePropertyWithReviews = async (req, res) => {
    try {
        const { propertyId } = req.body;

        // Validate propertyId
        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "propertyId is required"
            });
        }

        // Check if property is in TenantPayment (i.e., not available)
        const paymentExists = await TenantPayment.findOne({
            where: { propertyId }
        });

        if (paymentExists) {
            return res.status(400).json({
                success: false,
                message: "This property is not available"
            });
        }

        // Fetch specific available property with reviews and landlord details
        const property = await Property.findByPk(propertyId, {
            include: [
                {
                    model: Review,
                    as: "reviews",
                    required: false // Left join to include property even without reviews
                },
                {
                    model: User,
                    as: "landlord",
                    attributes: ["id", "name", "image", "address"]
                }
            ]
        });

        // Check if property exists
        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found"
            });
        }

        // Calculate ratings from reviews
        const reviews = property.reviews || [];
        const totalReviews = reviews.length;
        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let totalRatingSum = 0;

        reviews.forEach((review) => {
            const rating = review.rating;
            totalRatingSum += rating;
            if (ratingCounts[rating] !== undefined) {
                ratingCounts[rating]++;
            }
        });

        const overallRating = totalReviews > 0 ? (totalRatingSum / totalReviews).toFixed(1) : "0.0";

        // Format the property data
     // Check if there are reviews
const hasReviews = reviews.length > 0;

const formattedProperty = {
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
                ? parsedImages
                    .map(image => (typeof image === "string" ? image : image?.filename || ""))
                    .filter(Boolean)
                    .join(",")
                : "";
        } catch {
            return "";
        }
    })(),
    videoUrl: (() => {
        try {
            if (!property.videoUrl || property.videoUrl === "") return null;
            const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
            const parsedVideo = cleanedVideo.startsWith("{") ? JSON.parse(cleanedVideo) : cleanedVideo;
            return typeof parsedVideo === "object" && parsedVideo?.filename
                ? parsedVideo.filename
                : parsedVideo;
        } catch {
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
    
    paymentStatus: "Unpaid",
    landlord: property.landlord ? property.landlord.toJSON() : null,
    reviewStats: hasReviews ? {
        overallRating,
        totalReviews,
        ratingCounts
    } : {
        overallRating: "0.0",
        totalReviews: 0,
        ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    reviews: hasReviews ? reviews.map(r => r.toJSON()) : "No reviews found",
    createdAt: property.createdAt,
    updatedAt: property.updatedAt
};


        // Log the final formatted property for debugging
        console.log("Formatted property:", JSON.stringify(formattedProperty, null, 2));

        return res.status(200).json({
            success: true,
            message: "Available property with reviews fetched successfully",
            data: formattedProperty
        });

    } catch (error) {
        console.error("Error fetching available property with reviews:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};