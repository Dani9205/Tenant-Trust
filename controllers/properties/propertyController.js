const Property = require('../../models/PropertyModel');
const User = require('../../models/User');
const Review = require('../../models/Review');
const TenantPayment = require('../../models/TenantPayment'); // Add this import
exports.createProperty = async (req, res) => {
    try {
        console.log("Files received:", req.files);
        console.log("Received propertyType:", req.body.propertyType);

        // Handle images
        let imagePaths = [];
        if (req.files?.images?.length > 0) {
            imagePaths = req.files.images.map(file => file.filename);
        }

        // Handle video
        let videoPath = null;
        if (req.files?.video?.length > 0) {
            videoPath = req.files.video[0].filename;
        }

        // Clean and format amenities string
        let rawAmenities = req.body.amenities || "";
        let cleanedAmenities = rawAmenities
            .split(",")                      // Split by commas
            .map(a => a.trim())              // Trim spaces
            .filter(a => a !== "")           // Remove empty items
            .join(", ");                     // Join back with clean comma+space

        // ENUM validation
        const propertyType = req.body.propertyType?.trim();
        const saleOrRent = req.body.saleOrRent?.trim();
        const paymentFrequency = req.body.paymentFrequency?.trim();

        const validPropertyTypes = ['Residential', 'Commercial', 'New Listings', 'Vacation Rental'];
        const validSaleOrRent = ['Sale', 'Rent', 'Lease'];
        const validFrequencies = ['Monthly', 'Yearly'];

        if (!validPropertyTypes.includes(propertyType)) {
            return res.status(400).json({ success: false, message: "Invalid propertyType value" });
        }
        if (!validSaleOrRent.includes(saleOrRent)) {
            return res.status(400).json({ success: false, message: "Invalid saleOrRent value" });
        }
        if (paymentFrequency && !validFrequencies.includes(paymentFrequency)) {
            return res.status(400).json({ success: false, message: "Invalid paymentFrequency value" });
        }

        // Create Property
        const property = await Property.create({
            userId: Number(req.body.userId),
            title: req.body.title,
            propertyType,
            saleOrRent,
            paymentFrequency: paymentFrequency || null,
            amount: req.body.amount,
            bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : null,
            bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : null,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            rentDeadline: req.body.rentDeadline,
            location: req.body.location,
            latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
            description: req.body.description,
            amenities: cleanedAmenities, // Stored as clean string
            images: JSON.stringify(imagePaths),
            videoUrl: videoPath || null
        });

        // Get latest payment
        const latestPayment = await TenantPayment.findOne({
            where: { propertyId: property.id },
            order: [["createdAt", "DESC"]]
        });

        // Format response
        res.status(201).json({
            success: true,
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
                images: (() => {
                    try {
                        const parsed = JSON.parse(property.images);
                        return Array.isArray(parsed) ? parsed.join(",") : "";
                    } catch (error) {
                        return "";
                    }
                })(),
                videoUrl: property.videoUrl || null,
                amenities: property.amenities, // Return cleaned string
                paymentStatus: latestPayment &&
                    (latestPayment.paymentStatus === "onTime" || latestPayment.paymentStatus === "latePay")
                    ? "Paid"
                    : "Unpaid",
                createdAt: property.createdAt,
                updatedAt: property.updatedAt
            }
        });

    } catch (err) {
        console.error("Error creating property:", err);
        res.status(500).json({
            success: false,
            message: "Error creating property",
            error: err.message
        });
    }
};





exports.updateProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findByPk(propertyId);

        if (!property) {
            return res.status(404).json({ success: false, message: "Property not found" });
        }

        console.log("Files received:", req.files);

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

        // Handle amenities as clean string like createProperty
        let rawAmenities = req.body.amenities || "";
        let cleanedAmenities = rawAmenities
            .split(",")
            .map(a => a.trim())
            .filter(a => a !== "")
            .join(", ");

        // Update property
        await property.update({
            userId: property.userId,
            title: req.body.title || property.title,
            propertyType: req.body.propertyType || property.propertyType,
            saleOrRent: req.body.saleOrRent || property.saleOrRent,
            paymentFrequency: req.body.paymentFrequency || property.paymentFrequency,
            amount:req.body.amount || property.amount,
            bedrooms: req.body.bedrooms ? Number(req.body.bedrooms) : property.bedrooms,
            bathrooms: req.body.bathrooms ? Number(req.body.bathrooms) : property.bathrooms,
            startDate: req.body.startDate || property.startDate,
            endDate: req.body.endDate || property.endDate,
            rentDeadline: req.body.rentDeadline || property.rentDeadline,
            location: req.body.location || property.location,
            latitude: req.body.latitude ? parseFloat(req.body.latitude) : property.latitude,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : property.longitude,
            description: req.body.description || property.description,
            amenities: cleanedAmenities,
            images: JSON.stringify(imagePaths),
            videoUrl: videoPath
        });

        const latestPayment = await TenantPayment.findOne({
            where: { propertyId: property.id },
            order: [["createdAt", "DESC"]]
        });

        // Final response
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
                        const parsed = JSON.parse(property.images);
                        return Array.isArray(parsed) ? parsed.join(",") : "";
                    } catch (error) {
                        return "";
                    }
                })(),
                videoUrl: property.videoUrl || null,
                amenities: property.amenities,
                paymentStatus: latestPayment &&
                    (latestPayment.paymentStatus === "onTime" || latestPayment.paymentStatus === "latePay")
                    ? "Paid"
                    : "Unpaid",
                createdAt: property.createdAt,
                updatedAt: property.updatedAt
            }
        });
    } catch (err) {
        console.error("Error updating property:", err);
        res.status(500).json({
            success: false,
            message: "Error updating property",
            error: err.message
        });
    }
};




exports.deleteProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findByPk(propertyId);

        if (!property) {
            return res.status(404).json({   success: false, message: "Property not found" });
        }

        await property.destroy();
        res.status(200).json({
            success: true,
            message: "Property deleted successfully"
        });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({
            success: false,
            message: "Error deleting property",
            error: err.message
        });
    }
};



