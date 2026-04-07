const User = require("../../models/User");
const MaintenanceReview = require("../../models/MaintenanceReview");
const MaintenanceRequest = require("../../models/MaintenanceRequest");
const PropertyModel = require("../../models/PropertyModel");
const sequelize = require('../../config/db'); // ✅ correct path to your sequelize instance


exports.getMaintenanceReviews = async (req, res) => {
    const { maintenanceRequestId } = req.body;

    if (!maintenanceRequestId || isNaN(maintenanceRequestId)) {
        return res.status(400).json({ success: false, message: 'Valid maintenanceRequestId is required.' });
    }

    try {
        const maintenanceRequest = await MaintenanceRequest.findByPk(maintenanceRequestId);
        if (!maintenanceRequest) {
            return res.status(404).json({ success: false, message: "Maintenance request not found." });
        }

        const propertyId = maintenanceRequest.propertyId;

        const property = await PropertyModel.findByPk(propertyId, {
            include: [
                { model: User, as: "landlord", attributes: ["id", "name", "image", "address"] },
                { model: User, as: "tenant", attributes: ["id", "name", "image", "address"] }
            ]
        });

        if (!property) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        const formatImagesAsString = (str) => {
            if (!str) return '';
            return str.replace(/^"|"$/g, '').replace(/\\/g, '/');
        };

        const images = (() => {
            try {
                const raw = property.images;
                if (!raw) return '';
                const parsed = JSON.parse(raw.replace(/^"|"$/g, "").replace(/\\"/g, '"'));
                return Array.isArray(parsed) ? parsed.map(img => img.filename || img).join(", ") : '';
            } catch {
                return '';
            }
        })();

        const videoUrl = (() => {
            try {
                const raw = property.videoUrl;
                if (!raw) return null;
                const parsed = JSON.parse(raw.replace(/^"|"$/g, "").replace(/\\"/g, '"'));
                return parsed.filename || parsed;
            } catch {
                return null;
            }
        })();

        const amenities = (() => {
            try {
                const raw = property.amenities;
                if (!raw) return '';
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                return Array.isArray(parsed) ? parsed.join(", ") : parsed.toString();
            } catch {
                return '';
            }
        })();

        const transformedProperty = {
            ...property.toJSON(),
            images,
            videoUrl,
            amenities
        };

        // Fetch reviews only for this specific maintenance request
        const reviewsData = await MaintenanceReview.findAll({
            where: { maintenanceRequestId },
            include: [
                {
                    model: MaintenanceRequest,
                    as: 'maintenanceRequest',
                    attributes: ['id', 'description', 'status', 'images', 'responceDescription', 'responceImages', 'createdAt']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'image']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const reviews = reviewsData.map(r => r.toJSON());
        const averageRating = reviews.length > 0
            ? (reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / reviews.length).toFixed(1)
            : "0.0";

        const reviewCounts = {
            one: 0,
            two: 0,
            three: 0,
            four: 0,
            five: 0
        };

        reviews.forEach(r => {
            const rating = r.rating;
            if (rating >= 5) reviewCounts.five++;
            else if (rating >= 4) reviewCounts.four++;
            else if (rating >= 3) reviewCounts.three++;
            else if (rating >= 2) reviewCounts.two++;
            else reviewCounts.one++;
        });

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
            message: "Maintenance reviews fetched by request ID.",
            data: {
                progress: {
                    totalReviews: reviews.length,
                    averageRating,
                    ...reviewCounts
                },
                property: transformedProperty,
                reviews: transformedReviews.length ? transformedReviews : "No maintenance reviews found"
            }
        });

    } catch (error) {
        console.error("Error in getMaintenanceReviews:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
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




