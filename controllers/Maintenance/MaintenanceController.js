const MaintenanceRequest = require("../../models/MaintenanceRequest");
const Property = require("../../models/PropertyModel");
const MaintenanceReview = require("../../models/MaintenanceReview");

const Review = require("../../models/Review");
const FavouriteProperty = require("../../models/FavouriteProperty");
const BookingRequest = require("../../models/BookingRequest");
const sequelize = require('../../config/db'); // ✅ correct path to your sequelize instance
const { Op, fn, col } = require("sequelize");
const User = require("../../models/User");


exports.createRequest = async (req, res) => {
  try {
    const { propertyId, title, description, requestDate, assignedToId, userId } = req.body;
    const tenantId = req.user?.id;

    if (!propertyId || !tenantId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing propertyId or user authentication' });
    }

    const property = await Property.findOne({
      where: { id: propertyId, assignedToId: tenantId },
    });
    if (!property) {
      return res
        .status(403)
        .json({ success: false, message: 'Unauthorized request' });
    }

    const images = req.files && req.files.length
      ? req.files.map(f => `uploads/${f.filename}`).join(',')
      : '';

    const request = await MaintenanceRequest.create({
      propertyId,
      assignedToId: tenantId,
      title,
      assignedToId,
      userId,
      requestDate,
      description,
      images,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance request created successfully',
      data: {
        ...request.get(),
        images,
      },
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};


exports.getRequestsByStatusAndUserId = async (req, res) => {
  try {
    const { status,propertyId } = req.body;

    const validStatuses = ["Pending", "Active", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid or missing status" });
    }

    // if (!userId) {
    //   return res.status(401).json({ success: false, message: "User ID not found in request" });
    // }
    if (!propertyId) {
      return res.status(401).json({ success: false, message: "property ID not found in request" });
    }

    // Fetch maintenance requests
    const requests = await MaintenanceRequest.findAll({
      where: { status, propertyId },
    });

    // Format requests with images and ratings
    const formattedRequests = await Promise.all(requests.map(async (request) => {
      const raw = request.get();

      let cleanImages = raw.images;
      if (typeof cleanImages === 'string') {
        try {
          cleanImages = JSON.parse(cleanImages);
        } catch {
          // cleanImages = raw.images;
                    cleanImages = raw.cleanImages.split(',').map(img => img.trim());

        }
      }

      let cleanResponceImages = raw.responceImages;
      if (typeof cleanResponceImages === 'string') {
        try {
          cleanResponceImages = JSON.parse(cleanResponceImages);
        } catch {
          cleanResponceImages = raw.responceImages.split(',').map(img => img.trim());
        }
      }

      // Fetch the rating from the MaintenanceReview table
      const review = await MaintenanceReview.findOne({
        where: { maintenanceRequestId: raw.id },
        attributes: ['rating'],
      });

      return {
        ...raw,
        images: cleanImages,
        responceImages: cleanResponceImages,
        rating: review ? review.rating : null,
      };
    }));

    if (formattedRequests.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No maintenance requests found.",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data: formattedRequests,
    });

  } catch (error) {
    console.error("Error fetching requests by userId:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};




exports.getRequestsByStatusAndAssignedToId = async (req, res) => {
  try {
    const { status, propertyId } = req.body;

    const validStatuses = ["Pending", "Active", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid or missing status" });
    }

    if (!propertyId) {
      return res.status(400).json({ success: false, message: "Missing propertyId in request" });
    }

    const requests = await MaintenanceRequest.findAll({
      where: { status, propertyId },
    });

    const formattedRequests = await Promise.all(requests.map(async (request) => {
      const raw = request.get();

      let cleanImages = raw.images;
      if (typeof cleanImages === 'string') {
        try {
          cleanImages = JSON.parse(cleanImages);
        } catch {
                    cleanImages = raw.cleanImages.split(',').map(img => img.trim());
        }
      }

      let cleanResponceImages = raw.responceImages;
      if (typeof cleanResponceImages === 'string') {
        try {
          cleanResponceImages = JSON.parse(cleanResponceImages);
        } catch {
          cleanResponceImages = raw.responceImages.split(',').map(img => img.trim());
        }
      }

      // Fetch review rating
      const review = await MaintenanceReview.findOne({
        where: { maintenanceRequestId: raw.id },
        attributes: ['rating'],
      });

      return {
        ...raw,
        images: cleanImages,
        responceImages: cleanResponceImages,
        rating: review ? review.rating : null,
      };
    }));

    if (formattedRequests.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No maintenance requests found.",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data: formattedRequests,
    });

  } catch (error) {
    console.error("Error fetching requests by assignedToId:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};




exports.updateRequest = async (req, res) => {
    try {
        const { requestId, title, description, requestDate } = req.body;
        const tenantId = req.user?.id;

        if (!requestId || !tenantId) {
            return res.status(400).json({ success: false, message: "Missing request ID or authentication" });
        }

        const request = await MaintenanceRequest.findOne({
            where: { id: requestId, status: "Pending" }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found or cannot be updated" });
        }

        // Always overwrite with new images only
        const newImages = req.files?.length
            ? req.files.map(file => `uploads/${file.filename}`).slice(0, 10)
            : [];

        const imagesString = newImages.length > 0 ? newImages.join(',') : null;

        await request.update({
            title,
            description,
            requestDate: requestDate ? new Date(requestDate) : request.requestDate,
            images: imagesString
        });

        res.status(200).json({
            success: true,
            message: "Request updated successfully",
            data: {
                ...request.get(),
                images: imagesString
            }
        });
    } catch (error) {
        console.error("Error updating request:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.deleteRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const tenantId = req.user?.id;

        console.log("req.body:", req.body);
        console.log("req.user:", req.user);

        if (!requestId || !tenantId) {
            return res.status(400).json({ success: false, message: "Missing request ID or authentication" });
        }

        const request = await MaintenanceRequest.findOne({
            where: {
                id: requestId,
                status: "Pending"
            },
            logging: console.log
        });

        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found or cannot be deleted" });
        }

        await request.destroy();

        res.status(200).json({ success: true, message: "Request deleted successfully" });
    } catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};










exports.respondToRequest = async (req, res) => {
    try {
        const { requestId, responseDescription } = req.body;
    const userId = req.user?.id; // tenant userId from auth middleware

        // Debugging: Log received data
        console.log("Body:", req.body);
        console.log("Files:", req.files);

        // Find the request
        const request = await MaintenanceRequest.findByPk(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }
     if (!userId) {
      return res.status(401).json({ success: false, message: "User ID not found in request" });
    }
      const property = await Property.findOne({
      where: { id: request.propertyId, userId },
      attributes: ["id"],
    });
    if (!property) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

        // Authorization: Ensure the user can respond (e.g., tenant or admin)
     

        // Format new response images as uploads\filename
        const newResponseImages = req.files && req.files.length
            ? req.files.map(file => `uploads/${file.filename}`).join(',')
            : '';

        // Get existing response images (if any) and clean them
        let existingResponseImages = [];
        if (request.responceImages && typeof request.responceImages === 'string') {
            try {
                // Try parsing as JSON (for backward compatibility)
                existingResponseImages = JSON.parse(request.responceImages)
                    .map(p => p.trim())
                    .filter(p => p.match(/^uploads\\[a-zA-Z0-9_-]+\.[a-zA-Z]+$/))
                    .map(p => p.replace(/^uploads[\\/]+/, 'uploads\\'));
            } catch (e) {
                // If not JSON, treat as CSV
                existingResponseImages = request.responceImages
                    .split(',')
                    .map(p => p.trim())
                    .filter(p => p.match(/^uploads\\[a-zA-Z0-9_-]+\.[a-zA-Z]+$/))
                    .map(p => p.replace(/^uploads[\\/]+/, 'uploads\\'));
            }
        }

        // Combine new and existing images, limit to 10
        const updatedResponseImages = [...existingResponseImages, ...(newResponseImages ? newResponseImages.split(',') : [])].slice(0, 10);
        const responseImagesString = updatedResponseImages.length > 0 ? updatedResponseImages.join(',') : null;

        // Update request with response details
        await request.update({
            responceDescription: responseDescription || request.responceDescription,
            responceImages: responseImagesString,
            status: "Active"
        });

        let cleanedImages = '';
if (request.images && typeof request.images === 'string') {
    let raw = request.images;

    // Remove surrounding quotes if present
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
        raw = raw.slice(1, -1);
    }

    // Replace double backslashes with single backslashes
    cleanedImages = raw.replace(/\\\\/g, '\\');
}

        // Prepare response
        res.json({
            success: true,
            message: "Request responded to successfully",
            data: {
                ...request.get(),
                        images: cleanedImages,

                responceImages: responseImagesString
            }
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};






exports.getLandlordPropertiesWithMaintenanceCountAndDetails = async (req, res) => {
  try {
    const userId      = req.user.id;
    const landlordId  = req.body.landlordId || userId;

    /* ───────── 1. properties that HAVE maintenance requests ───────── */
    const properties = await Property.findAll({
      where: { userId: landlordId },
      include: [
        {
          model: MaintenanceRequest,
          required: true,                  // only properties with at least one request
          include: [
            {
              model: User,
              as:   'tenant',               // make sure the alias matches your association
              attributes: ['id', 'name', 'image', 'address']
            }
          ]
        }
      ]
      // ← no raw / nest → no duplicates
    });

    if (!properties.length) {
      return res.status(200).json({
        success: true,
        message: 'No properties with maintenance requests found',
        data: []
      });
    }

    /* ───────── 2. helper look-ups (ratings, favourites, bookings) ───────── */
    const propertyIds = properties.map(p => p.id);

    const reviews = await Review.findAll({
      attributes: [
        'propertyId',
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']
      ],
      where : { propertyId: { [Op.in]: propertyIds } },
      group : ['propertyId'],
      raw   : true
    });
    const ratingsMap = new Map(reviews.map(r => [r.propertyId, parseFloat(r.avgRating).toFixed(1)]));

    const favouriteIds = new Set(
      (await FavouriteProperty.findAll({
        where: { userId },
        attributes: ['propertyId'],
        raw: true
      })).map(f => f.propertyId)
    );

    const requestedIds = new Set(
      (await BookingRequest.findAll({
        where: { tenantId: userId },
        attributes: ['propertyId'],
        raw: true
      })).map(b => b.propertyId)
    );

    /* ───────── 3. format each property ───────── */
    const formatted = await Promise.all(
      properties.map(async (prop) => {
        const p = prop.get({ plain: true });      // flatten once

        /* ---- media helpers ---- */
        const images = (() => {
          try {
            if (!p.images) return '';
            const parsed = JSON.parse(
              p.images.replace(/^"|"$/g, '').replace(/\\"/g, '"')
            );
            return Array.isArray(parsed)
              ? parsed.map(img => (typeof img === 'string' ? img : img.filename))
                      .filter(Boolean)
                      .join(', ')
              : '';
          } catch { return ''; }
        })();

        const videoUrl = (() => {
          try {
            if (!p.videoUrl) return null;
            const cleaned = p.videoUrl.replace(/^"|"$/g, '').replace(/\\"/g, '"');
            const parsed  = cleaned.startsWith('{') ? JSON.parse(cleaned) : cleaned;
            return typeof parsed === 'object' && parsed.filename ? parsed.filename : parsed;
          } catch { return null; }
        })();

        const amenities = (() => {
          try {
            if (!p.amenities) return '';
            let parsed = p.amenities;
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); }
              catch {
                return parsed.split(',')
                             .map(x => x.trim())
                             .filter(Boolean)
                             .join(', ');
              }
            }
            if (Array.isArray(parsed))
              return parsed.map(x => String(x).trim()).filter(Boolean).join(', ');
            return String(parsed);
          } catch { return ''; }
        })();

        /* ---- maintenance requests already loaded ---- */
        const maintenanceRequests = await Promise.all(
          p.MaintenanceRequests.map(async (req) => {
            /* image clean-up */
            let imgs = req.images;
            if (typeof imgs === 'string') {
              try { imgs = JSON.parse(imgs); } catch { /* leave as is */ }
            }

            let respImgs = req.responceImages;
            if (typeof respImgs === 'string') {
              try { respImgs = JSON.parse(respImgs); }
              catch { respImgs = respImgs.split(',').map(x => x.trim()); }
            }

            /* optional review */
            const review = await MaintenanceReview.findOne({
              where: { maintenanceRequestId: req.id },
              attributes: ['rating'],
              raw: true
            });

            return {
              ...req,
              images: imgs,
              responceImages: respImgs,
              rating: review ? review.rating : null
            };
          })
        );

        /* ---- push final card ---- */
        return {
          id: p.id,
          userId: p.userId,
          title: p.title,
          propertyType: p.propertyType,
          saleOrRent: p.saleOrRent,
          paymentFrequency: p.paymentFrequency,
          amount: p.amount,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          startDate: p.startDate,
          endDate: p.endDate,
          rentDeadline: p.rentDeadline,
          location: p.location,
          latitude: p.latitude,
          longitude: p.longitude,
          description: p.description,
          rating: ratingsMap.get(p.id) || null,
          favStatus: favouriteIds.has(p.id),
          requested: requestedIds.has(p.id),
          images,
          videoUrl,
          amenities,
          paymentStatus: 'Unpaid',            // you can compute this if needed
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          maintenanceRequestCount: maintenanceRequests.length,
          maintenanceRequests
        };
      })
    );

    /* ───────── 4. respond ───────── */
    return res.status(200).json({
      success: true,
      message: 'Properties with maintenance requests fetched successfully',
      data: formatted
    });

  } catch (err) {
    console.error('Error fetching landlord properties with maintenance details:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


