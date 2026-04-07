const { Op, fn, col, where, Sequelize } = require("sequelize");
const Property = require("../models/PropertyModel");
const SearchHistory = require("../models/SearchHistory");
const Review = require("../models/Review");
const FavouriteProperty = require("../models/FavouriteProperty");
const BookingRequest = require("../models/BookingRequest");



const searchProperties = async (req, res) => {
  const { uid, keyword } = req.body;

  try {
    if (!keyword || !uid) {
      return res.status(400).json({
        success: false,
        message: "Keyword and userId are required",
        data: null,
      });
    }

    // Search matching properties
    const matchedProperties = await Property.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${keyword}%` } },
          { location: { [Op.like]: `%${keyword}%` } },
          { saleOrRent: { [Op.like]: `%${keyword}%` } },
        ],
      },
      raw: true,
    });

    const propertyIds = matchedProperties.map(p => p.id);

    // Ratings
    const reviews = await Review.findAll({
      attributes: [
        "propertyId",
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"]
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

    // Favourites
 // Favourites
const favourites = await FavouriteProperty.findAll({
  where: { userId: uid }, // <- FIXED LINE
  attributes: ["propertyId"],
  raw: true
});
const favouriteIds = new Set(favourites.map(fav => fav.propertyId));


    // Booking Requests
    const bookingRequests = await BookingRequest.findAll({
      where: { tenantId: uid },
      attributes: ["propertyId"],
      raw: true
    });
    const requestedIds = new Set(bookingRequests.map(req => req.propertyId));

    // Format each property
    const formattedProperties = matchedProperties.map(property => {
      const images = (() => {
        try {
          if (!property.images) return "";
          const cleaned = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
          const parsed = JSON.parse(cleaned);
          return Array.isArray(parsed)
            ? parsed.map(img => (typeof img === "string" ? img : img.filename)).filter(Boolean).join(", ")
            : "";
        } catch {
          return "";
        }
      })();

      const videoUrl = (() => {
        try {
          if (!property.videoUrl) return null;
          const cleaned = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
          const parsed = cleaned.startsWith("{") ? JSON.parse(cleaned) : cleaned;
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
              return raw.split(",").map(i => i.trim()).filter(Boolean).join(", ");
            }
          }
          return Array.isArray(parsed) ? parsed.map(i => String(i).trim()).filter(Boolean).join(", ") : String(parsed);
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
        amenities,
        paymentStatus: "Unpaid",
        createdAt: property.createdAt,
        updatedAt: property.updatedAt
      };
    });

    // Handle search history
    const normalizedKeyword = keyword.trim().toLowerCase();

    const existingEntry = await SearchHistory.findOne({
      where: {
        uid,
        [Op.and]: Sequelize.where(fn('LOWER', col('keyword')), normalizedKeyword),
      },
    });

    if (existingEntry) {
      existingEntry.updatedAt = new Date();
      await existingEntry.save();

      return res.status(200).json({
        success: true,
        message: "Search history updated successfully.",
        data: {
          history: existingEntry,
          properties: formattedProperties
        },
      });
    }

    const newSearch = await SearchHistory.create({
      uid,
      keyword: keyword.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Search history created successfully.",
      data: {
        history: newSearch,
        properties: formattedProperties
      },
    });

  } catch (error) {
    console.error("Error searching properties:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

module.exports = { searchProperties };







// const { Op, fn, col } = require("sequelize");

// const searchProperties = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { location, saleOrRent, title, keyword } = req.body; // ✅ changed from req.params to req.query

//     // Use keyword as fallback to title if title not provided
//     const searchTitle = title || keyword;

//     if (!location && !saleOrRent && !searchTitle) {
//       return res.status(400).json({
//         success: false,
//         message: 'Provide at least one of location, saleOrRent, or title.',
//         data: null,
//       });
//     }

//     // Create keyword and store or update in SearchHistory
//     const uid = userId;
//     const keywordText = [saleOrRent, location, searchTitle].filter(Boolean).join(' | ').trim();

//     if (keywordText) {
//       const existing = await SearchHistory.findOne({ where: { uid, keyword: keywordText } });
//       if (existing) {
//         existing.updatedAt = new Date();
//         await existing.save();
//       } else {
//         await SearchHistory.create({ uid, keyword: keywordText });
//       }
//     }

//     // Build filter
//     const where = { assignedToId: null };
//     if (location)     where.location = { [Op.iLike]: `%${location}%` };
//     if (saleOrRent)   where.saleOrRent = saleOrRent;
//     if (searchTitle)  where.title = { [Op.iLike]: `%${searchTitle}%` };

//     const properties = await Property.findAll({ where, raw: true });
//     const propertyIds = properties.map(p => p.id);

//     // Ratings
//     const reviews = await Review.findAll({
//       attributes: [
//         "propertyId",
//         [fn("AVG", col("rating")), "avgRating"]
//       ],
//       where: { propertyId: { [Op.in]: propertyIds } },
//       group: ["propertyId"],
//       raw: true
//     });
//     const ratingsMap = new Map(reviews.map(r => [r.propertyId, parseFloat(r.avgRating).toFixed(1)]));

//     // Favorites
//     const favouriteProps = await FavouriteProperty.findAll({
//       where: { userId },
//       attributes: ["propertyId"],
//       raw: true
//     });
//     const favouriteIds = new Set(favouriteProps.map(f => f.propertyId));

//     // Booking requests
//     const bookingRequests = await BookingRequest.findAll({
//       where: { tenantId: userId },
//       attributes: ["propertyId"],
//       raw: true
//     });
//     const requestedIds = new Set(bookingRequests.map(r => r.propertyId));

//     // Format results
//     const formattedProperties = properties.map(property => {
//       const images = (() => {
//         try {
//           if (!property.images) return "";
//           const cleaned = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
//           const parsed = JSON.parse(cleaned);
//           return Array.isArray(parsed)
//             ? parsed.map(img => typeof img === "string" ? img : img.filename).filter(Boolean).join(", ")
//             : "";
//         } catch {
//           return "";
//         }
//       })();

//       const videoUrl = (() => {
//         try {
//           if (!property.videoUrl) return null;
//           const cleaned = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
//           const parsed = cleaned.startsWith("{") ? JSON.parse(cleaned) : cleaned;
//           return typeof parsed === "object" && parsed.filename ? parsed.filename : parsed;
//         } catch {
//           return null;
//         }
//       })();

//       const amenities = (() => {
//         try {
//           const raw = property.amenities;
//           if (!raw || raw === "") return "";
//           let parsed = raw;
//           if (typeof raw === "string") {
//             try {
//               parsed = JSON.parse(raw);
//             } catch {
//               return raw.split(",").map(item => item.trim()).filter(Boolean).join(", ");
//             }
//           }
//           if (Array.isArray(parsed)) {
//             return parsed.map(item => String(item).trim()).filter(Boolean).join(", ");
//           }
//           return String(parsed);
//         } catch {
//           return "";
//         }
//       })();

//       return {
//         id: property.id,
//         userId: property.userId,
//         title: property.title,
//         propertyType: property.propertyType,
//         saleOrRent: property.saleOrRent,
//         paymentFrequency: property.paymentFrequency,
//         amount: property.amount,
//         bedrooms: property.bedrooms,
//         bathrooms: property.bathrooms,
//         startDate: property.startDate,
//         endDate: property.endDate,
//         rentDeadline: property.rentDeadline,
//         location: property.location,
//         latitude: property.latitude,
//         longitude: property.longitude,
//         description: property.description,
//         rating: ratingsMap.get(property.id) || null,
//         favStatus: favouriteIds.has(property.id),
//         requested: requestedIds.has(property.id),
//         images,
//         videoUrl,
//         amenities,
//         paymentStatus: "Unpaid",
//         createdAt: property.createdAt,
//         updatedAt: property.updatedAt
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       message: 'Search completed successfully',
//       data: formattedProperties
//     });

//   } catch (error) {
//     console.error('Error searching properties:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       data: null
//     });
//   }
// };




// Delete a single search history item
const deleteSearchHistory = async (req, res) => {
    try {
        const { id } = req.body;

        // Check if ID is provided
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID is required.',
                data: null,
            });
        }

        // Delete the search history item by ID
        const deleted = await SearchHistory.destroy({ where: { id } });

        // If no item was found and deleted, return a 404
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Search history item not found.',
                data: null,
            });
        }

        // Success response
        return res.status(200).json({
            success: true,
            message: 'Search history item deleted successfully.',
            data: null,
        });
    } catch (error) {
        console.error('Error deleting search history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete search history.',
            data: null,
        });
    }
};


// Delete all search history items for a user
const deleteAllSearchHistory = async (req, res) => {
    try {
        const { uid } = req.body;

          // Validate input
          if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'UID is required.',
                data: null,
            });
        }

        await SearchHistory.destroy({ where: { uid } });
        return res.status(200).json({
            success: true,
            message: 'All search history items deleted successfully.',
            data: null,
        });
    } catch (error) {
        console.error('Error deleting all search history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete all search history.',
            data: null,
        });
    }
};

// Get all search history items for a user
const getSearchHistory = async (req, res) => {
    try {
        const { uid } = req.body;

          // Validate input
          if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'UID is required.',
                data: null,
            });
        }
const searchHistory = await SearchHistory.findAll({
  where: { uid },
  order: [['updatedAt', 'DESC']], // not 'createdAt'
});

        return res.status(200).json({
            success: true,
            message: 'Search history retrieved successfully.',
            data: {history:searchHistory,}
        });
    } catch (error) {
        console.error('Error fetching search history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve search history.',
            data: null,
        });
    }
};

module.exports = {
    searchProperties,
    deleteSearchHistory,
    deleteAllSearchHistory,
    getSearchHistory,
};

