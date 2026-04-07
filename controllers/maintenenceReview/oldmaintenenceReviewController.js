const User = require("../../models/User");
const MaintenanceReview = require("../../models/MaintenanceReview");
const MaintenanceRequest = require("../../models/MaintenanceRequest");
const PropertyModel = require("../../models/PropertyModel");
const sequelize = require('../../config/db'); // ✅ correct path to your sequelize instance



exports.getMaintenanceReviews = async (req, res) => {
    const { propertyId } = req.body;

    if (!propertyId || isNaN(propertyId)) {
        return res.status(400).json({ success: false, message: 'Valid propertyId is required.' });
    }

    try {
        // Fetch property with landlord and tenant
        const property = await PropertyModel.findByPk(propertyId, {
            include: [
                { model: User, as: "landlord", attributes: ["id", "name", "image", "address"] },
                { model: User, as: "tenant", attributes: ["id", "name", "image", "address"] }
            ]
        });

        if (!property) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        // Transform property data
        const images = (() => {
            try {
                if (!property.images || property.images === "") return "";
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
                return typeof parsedVideo === "object" && parsedVideo.filename
                    ? parsedVideo.filename
                    : parsedVideo;
            } catch {
                return null;
            }
        })();

        const amenities = (() => {
            try {
                const raw = property.amenities;
                if (!raw || raw === "") return "";

                let parsed = raw;

                // If it's a string, try to parse it
                if (typeof raw === "string") {
                    try {
                        parsed = JSON.parse(raw);
                    } catch (e) {
                        // If JSON parsing fails, assume it's a plain string (maybe CSV)
                        return raw.split(",").map(item => item.trim()).filter(Boolean).join(", ");
                    }
                }

                // Normalize output
                if (Array.isArray(parsed)) {
                    return parsed.map(item => String(item).trim()).filter(Boolean).join(", ");
                }

                return String(parsed);
            } catch {
                return "";
            }
        })();

        const transformedProperty = {
            ...property.toJSON(),
            images,
            videoUrl,
            amenities
        };

        // Fetch reviews with associated request and user
        const reviewsData = await MaintenanceReview.findAll({
            where: { '$maintenanceRequest.propertyId$': propertyId }, // Updated alias in where clause
            include: [
                {
                    model: MaintenanceRequest,
                    as: 'maintenanceRequest', // Fixed alias from 'request' to 'maintenanceRequest'
                    attributes: ['id', 'description', 'status', 'images', 'responceDescription', 'responceImages', 'createdAt']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'image']
                }
            ],
            attributes: {
                include: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
            },
            group: ['MaintenanceReview.id', 'maintenanceRequest.id', 'user.id'], // Updated alias in group clause
            order: [['createdAt', 'DESC']]
        });

        const reviews = reviewsData.map(review => review.toJSON());
        const averageRating = reviews.length > 0
            ? parseFloat(reviews[0].avgRating || 0).toFixed(1)
            : "0.0";

        if (!reviews.length) {
            return res.status(200).json({
                success: true,
                message: "Property fetched. No maintenance reviews found.",
                data: {
                    progress: {
                        totalReviews: 0,
                        averageRating: "0.0",
                        one: 0,
                        two: 0,
                        three: 0,
                        four: 0,
                        five: 0
                    },
                    property: transformedProperty,
                    reviews: "No maintenance reviews found"
                }
            });
        }

        // Count star ratings
        const countResults = await MaintenanceReview.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('*')), 'count'],
                [sequelize.literal(`CASE 
                    WHEN rating = 5 THEN '5star'
                    WHEN rating BETWEEN 4 AND 4.9 THEN '4star'
                    WHEN rating BETWEEN 3 AND 3.9 THEN '3star'
                    WHEN rating BETWEEN 2 AND 2.9 THEN '2star'
                    WHEN rating BETWEEN 0 AND 1.9 THEN '1star'
                END`), 'ratingStar']
            ],
            include: [{
                model: MaintenanceRequest,
                as: 'maintenanceRequest', // Fixed alias from 'request' to 'maintenanceRequest'
                where: { propertyId }
            }],
            group: ['ratingStar']
        });

        const reviewCounts = {
            one: 0,
            two: 0,
            three: 0,
            four: 0,
            five: 0
        };

        const starKeyMap = {
            '1star': 'one',
            '2star': 'two',
            '3star': 'three',
            '4star': 'four',
            '5star': 'five'
        };

        countResults.forEach(result => {
            const key = result.dataValues.ratingStar;
            const count = parseInt(result.dataValues.count);
            if (starKeyMap[key]) {
                reviewCounts[starKeyMap[key]] = count;
            }
        });
        const formatImagesAsString = (str) => {
            if (!str) return '';
            return str.replace(/^"|"$/g, '').replace(/\\/g, '/');
        };
        // Transform final review response
        const transformedReviews = reviews.map(review => ({
            id: review.id,
            rating: review.rating,
            feedback: review.feedback,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            maintenanceRequest: review.maintenanceRequest ? {
                id: review.maintenanceRequest.id,
                description: review.maintenanceRequest.description,
                status: review.maintenanceRequest.status,
                images: formatImagesAsString(review.maintenanceRequest.images),
                // fallback if somehow it's an object
                responceDescription: review.maintenanceRequest.responceDescription || null,
                responceImages: formatImagesAsString(review.maintenanceRequest.responceImages),

                createdAt: review.maintenanceRequest.createdAt
            } : null,

            user: {
                id: review.user?.id,
                name: review.user?.name,
                image: review.user?.image
            }
        }));

        return res.status(200).json({
            success: true,
            message: "Maintenance reviews and ratings fetched.",
            data: {
                progress: {
                    totalReviews: reviews.length,
                    averageRating,
                    ...reviewCounts
                },
                property: transformedProperty,
                reviews: transformedReviews
            }
        });

    } catch (error) {
        console.error("Error in getMaintenanceReviews:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};



exports.createMaintenanceReview = async (req, res) => {
    try {
        const { userId, maintenanceRequestId, rating, feedback } = req.body;

        if (!userId || !maintenanceRequestId || !rating) {
            return res.status(400).json({
                success: false,
                message: "userId, maintenanceRequestId and rating are required.",
            });
        }

        // Get user
        const user = await User.findByPk(Number(userId));
        // if (!user || user.type !== 'tenant') {
        //     return res.status(403).json({
        //         success: false,
        //         message: "Only tenants can create a maintenance review.",
        //     });
        // }

        // Get maintenance request and related property
        const maintenanceRequest = await MaintenanceRequest.findByPk(maintenanceRequestId);
        if (!maintenanceRequest) {
            return res.status(404).json({
                success: false,
                message: "Maintenance request not found.",
            });
        }

        const property = await PropertyModel.findByPk(maintenanceRequest.propertyId);

        if (!property || property.assignedToId !== Number(userId)) {
            console.log("Property check failed:", {
                assignedToId: property?.assignedToId,
                userId
            });
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this property.",
            });
        }
        // Check if a review already exists for this maintenance request
        const existingReview = await MaintenanceReview.findOne({
            where: { maintenanceRequestId }
        });
        if (existingReview) {
            return res.status(409).json({
                success: false,
                message: "Review already exists for this maintenance request.",
            });
        }

        // Create review
        const newReview = await MaintenanceReview.create({
            userId,
            maintenanceRequestId,
            rating,
            feedback
        });
            await maintenanceRequest.update({ status: "Completed" });


        return res.status(201).json({
            success: true,
            message: "Review created successfully.",
            data: newReview
        });

    } catch (error) {
        console.error("Error in createMaintenanceReview:", error);
        res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }
};




