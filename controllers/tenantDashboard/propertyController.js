const Property = require('../../models/PropertyModel');
const User = require('../../models/User');
const { Op } = require("sequelize");

const TenantPayment = require("../../models/TenantPayment");
const Review = require("../../models/Review");



const path = require("path");


exports.createProperty = async (req, res) => {
    try {
        console.log("Files received:", req.files); // Debugging

        // Handle images
        let imagePaths = [];
        if (req.files?.images?.length > 0) {
            imagePaths = req.files.images.map(file => file.filename); // Use filename only
        }

        // Handle video
        let videoPath = null;
        if (req.files?.video?.length > 0) {
            videoPath = req.files.video[0].filename; // Use filename only
        }

        // Ensure amenities is an array before joining
        let amenities = req.body.amenities;
        if (typeof amenities === "string") {
            amenities = amenities.split(",").map(item => item.trim()); // Convert comma-separated string to array
        } else if (!Array.isArray(amenities)) {
            amenities = []; // Default to an empty array if not an array or string
        }

        // Create Property
        const property = await Property.create({
            userId: Number(req.body.userId),
            title: req.body.title,
            propertyType: req.body.propertyType,
            saleOrRent: req.body.saleOrRent,
            paymentFrequency: req.body.paymentFrequency,
            amount: parseFloat(req.body.amount),
            bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : null,
            bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : null,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            rentDeadline: req.body.rentDeadline,
            location: req.body.location,
            latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
            description: req.body.description,
            amenities: amenities, // Store as an array (avoid JSON.stringify)
            images: imagePaths,
            videoUrl: videoPath
        });

        res.status(201).json({
            status: "success",
            message: "Property created successfully.",
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
                amenities: property.amenities, // Already stored as an array
                images: property.images, // Corrected format
                videoUrl: property.videoUrl, // Corrected format
                createdAt: property.createdAt,
                updatedAt: property.updatedAt
            }
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({
            status: "error",
            message: "Error creating property",
            error: err.message
        });
    }
};







exports.getUserAssignedProperties = async (req, res) => {
    try {
        const { id: userId, userType } = req.user;

        if (userType !== "tenant") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only tenants can fetch assigned properties."
            });
        }

        const properties = await Property.findAll({
            where: { assignedToId: userId },
            include: [
                {
                    model: User,
                    as: "landlord",
                    attributes: ["id", "name", "image", "address"]
                },
                {
                    model: User,
                    as: "tenant",
                    attributes: ["id", "name", "image", "address"]
                }
            ]
             
        });

        const formattedProperties = await Promise.all(
            properties.map(async (property) => {
                const latestPayment = await TenantPayment.findOne({
                    where: { propertyId: property.id },
                    order: [["createdAt", "DESC"]]
                });

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
                    description: property.description,

                    // Parsing and formatting images
                    images: (() => {
                        try {
                            console.log("Raw images data:", property.images);
                            if (!property.images || property.images === "") {
                                console.log("Images field is empty or null");
                                return "";
                            }

                            let imageList;
                            if (typeof property.images === "string") {
                                // Handle escaped JSON string or plain comma-separated string
                                const cleanedImages = property.images
                                    .replace(/^"|"$/g, "") // Remove outer quotes
                                    .replace(/\\"/g, '"'); // Unescape quotes
                                console.log("Cleaned images string:", cleanedImages);

                                // Parse as JSON if it’s an array
                                const parsedImages = JSON.parse(cleanedImages);
                                console.log("Parsed images:", parsedImages);

                                if (Array.isArray(parsedImages)) {
                                    imageList = parsedImages
                                        .map(image => (typeof image === "string" ? image : image.filename))
                                        .filter(Boolean)
                                        .join(",");
                                } else {
                                    imageList = ""; // Fallback if not an array
                                }
                            } else {
                                imageList = ""; // Fallback if not a string
                            }
                            console.log("Formatted images:", imageList);
                            return imageList;
                        } catch (error) {
                            console.error("Error parsing images:", error.message);
                            return "";
                        }
                    })(),

                    // Parsing and formatting videoUrl
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

                                // If it’s a JSON object, parse it; otherwise, treat as plain filename
                                if (cleanedVideo.startsWith("{")) {
                                    const parsedVideo = JSON.parse(cleanedVideo);
                                    return parsedVideo.filename ? parsedVideo : null;
                                }
                                return cleanedVideo; // Return plain filename if not JSON
                            }
                            return null;
                        } catch (error) {
                            console.error("Error parsing videoUrl:", error.message);
                            return null;
                        }
                    })(),

                    // Parsing and formatting amenities
                    amenities: (() => {
                        try {
                            if (property.amenities && property.amenities !== "") {
                                const parsedAmenities = JSON.parse(property.amenities);
                                if (Array.isArray(parsedAmenities)) {
                                    return parsedAmenities
                                        .map(item => item.replace(/\\+/g, "").replace(/^"|"$/g, "").trim())
                                        .filter(Boolean)
                                        .join(",");
                                }
                            }
                            return "";
                        } catch (error) {
                            console.error("Error parsing amenities:", error);
                            return "";
                        }
                    })(),

                    paymentStatus: latestPayment &&
                        (latestPayment.paymentStatus === "On-Time Pay" || latestPayment.paymentStatus === "Late Pay")
                        ? "Paid"
                        : "Unpaid",


                    landlord: property.landlord,
                    tenant: property.tenant
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Assigned properties retrieved successfully.",
            data: formattedProperties
        });
    } catch (error) {
        console.error("Error fetching assigned properties:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch assigned properties.",
            error: error.message
        });
    }
};

exports.getSingleAssignedPropertyDetail = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const { id: userId, userType } = req.user;

        if (userType !== "tenant") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only tenants can fetch assigned properties."
            });
        }

        // Check if the property is actually assigned to the user
        const property = await Property.findOne({
            where: {
                id: propertyId,
                assignedToId: userId
            },
            include: [
                {
                    model: Review,
                    as: "reviews",
                    required: false
                },
                {
                    model: User,
                    as: "landlord",
                    attributes: ["id", "name", "image", "address"]
                },
                {
                    model: User,
                    as: "tenant",
                    attributes: ["id", "name", "image", "address"]
                }
            ]
        });

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Assigned property not found"
            });
        }

        // Calculate review ratings
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

        // Get latest payment
        const latestPayment = await TenantPayment.findOne({
            where: { propertyId: property.id },
            order: [["createdAt", "DESC"]]
        });

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

            // Format images
            images: (() => {
                try {
                    if (!property.images || property.images === "") return "";
                    const cleaned = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                    const parsed = JSON.parse(cleaned);
                    return Array.isArray(parsed) ? parsed.join(",") : "";
                } catch {
                    return "";
                }
            })(),

            // Format video
            videoUrl: (() => {
                try {
                    if (!property.videoUrl || property.videoUrl === "") return null;
                    const cleaned = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                    return cleaned.startsWith("{") ? JSON.parse(cleaned).filename || null : cleaned;
                } catch {
                    return null;
                }
            })(),

            // Format amenities
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

            paymentStatus:
                latestPayment &&
                (latestPayment.paymentStatus === "On-Time Pay" || latestPayment.paymentStatus === "Late Pay")
                    ? "Paid"
                    : "Unpaid",

            landlord: property.landlord,
            tenant: property.tenant,
            reviews,
            totalReviews,
            ratingCounts,
            overallRating
        };

        res.status(200).json({
            success: true,
            message: "Assigned property detail fetched successfully",
            data: formattedProperty
        });

    } catch (error) {
        console.error("Error fetching single assigned property:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




exports.getAllAssignedPropertiesForTenants = async (req, res) => {
    try {
        const { userType } = req.user;

        // Only allow access to tenants
        if (userType !== "tenant") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only tenants can view assigned properties."
            });
        }

        const properties = await Property.findAll({
            where: {
                assignedToId: { [Op.ne]: null } // assignedToId IS NOT NULL
            },
            include: [
                {
                    model: User,
                    as: "landlord",
                    attributes: ["id", "name", "image", "address"]
                },
                {
                    model: User,
                    as: "tenant",
                    attributes: ["id", "name", "image", "address"]
                }
            ]
        });

        const formattedProperties = await Promise.all(
            properties.map(async (property) => {
                const latestPayment = await TenantPayment.findOne({
                    where: { propertyId: property.id },
                    order: [["createdAt", "DESC"]]
                });

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
                    description: property.description,

                    images: (() => {
                        try {
                            if (!property.images || property.images === "") return "";
                            const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                            const parsedImages = JSON.parse(cleanedImages);
                            return Array.isArray(parsedImages)
                                ? parsedImages.map(img => typeof img === "string" ? img : img.filename).filter(Boolean).join(",")
                                : "";
                        } catch (error) {
                            return "";
                        }
                    })(),

                    videoUrl: (() => {
                        try {
                            if (!property.videoUrl || property.videoUrl === "") return null;
                            const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                            if (cleanedVideo.startsWith("{")) {
                                const parsedVideo = JSON.parse(cleanedVideo);
                                return parsedVideo.filename ? parsedVideo : null;
                            }
                            return cleanedVideo;
                        } catch (error) {
                            return null;
                        }
                    })(),

                    amenities: (() => {
                        try {
                            if (property.amenities && property.amenities !== "") {
                                const parsed = JSON.parse(property.amenities);
                                return Array.isArray(parsed)
                                    ? parsed.map(item => item.replace(/\\+/g, "").replace(/^"|"$/g, "").trim()).join(",")
                                    : "";
                            }
                            return "";
                        } catch (error) {
                            return "";
                        }
                    })(),

                    paymentStatus: latestPayment &&
                        (latestPayment.paymentStatus === "On-Time Pay" || latestPayment.paymentStatus === "Late Pay")
                        ? "Paid"
                        : "Unpaid",

                    landlord: property.landlord,
                    tenant: property.tenant
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "All assigned properties retrieved successfully.",
            data: formattedProperties
        });

    } catch (error) {
        console.error("Error fetching assigned properties:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch assigned properties.",
            error: error.message
        });
    }
};
