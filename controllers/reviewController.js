const User = require('../models/User');
const Review = require('../models/Review');
const TenantPayment=require('../models/TenantPayment');
const BookingRequest=require('../models/BookingRequest');
const sequelize = require('../config/db'); // ✅ correct path to your sequelize instance

const Property = require('../models/PropertyModel');
// ⬇️  make sure these models are required the same way you load the rest

// models import

const getStarReviews = async (req, res) => {
  const { propertyId } = req.body;

  /* ─────────────────── validation ─────────────────── */
  if (!propertyId || isNaN(propertyId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid propertyId is required.'
    });
  }

  try {
    /* ─────────── property + landlord / tenant ─────────── */
    const property = await Property.findByPk(propertyId, {
      include: [
        { model: User, as: 'landlord', attributes: ['id', 'name', 'image', 'address'] },
        { model: User, as: 'tenant',   attributes: ['id', 'name', 'image', 'address'] }
      ]
    });

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    /* ─────────────────── latest payment ─────────────────── */
    const latestPayment = await TenantPayment.findOne({
      where: { propertyId: property.id },
      order: [['createdAt', 'DESC']]
    });

    /* ─────────────────── latest booking ─────────────────── */
    const latestBooking = await BookingRequest.findOne({
  where: { propertyId: property.id },
  order: [['createdAt', 'DESC']]
});

// ✅ Use correct field name: requestStatus
const bookingStatus = latestBooking ? latestBooking.requestStatus : '';


    /* ───────── helpers (images, video, amenities) ───────── */
    const images = (() => {
      try {
        if (!property.images || property.images === '') return '';
        const cleaned = property.images.replace(/^"|"$/g, '').replace(/\\"/g, '"');
        const parsed  = JSON.parse(cleaned);
        return Array.isArray(parsed)
          ? parsed
              .map(img => (typeof img === 'string' ? img : img.filename))
              .filter(Boolean)
              .join(', ')
          : '';
      } catch {
        return '';
      }
    })();

    const videoUrl = (() => {
      try {
        if (!property.videoUrl || property.videoUrl === '') return null;
        const cleaned = property.videoUrl.replace(/^"|"$/g, '').replace(/\\"/g, '"');
        const parsed  = cleaned.startsWith('{') ? JSON.parse(cleaned) : cleaned;
        return typeof parsed === 'object' && parsed.filename ? parsed.filename : parsed;
      } catch {
        return null;
      }
    })();

    const amenities = (() => {
      try {
        const raw = property.amenities;
        if (!raw || raw === '') return '';
        let parsed = raw;
        if (typeof raw === 'string') {
          try {
            parsed = JSON.parse(raw);
          } catch {
            return raw
              .split(',')
              .map(item => item.trim())
              .filter(Boolean)
              .join(', ');
          }
        }
        if (Array.isArray(parsed)) {
          return parsed
            .map(item => String(item).trim())
            .filter(Boolean)
            .join(', ');
        }
        return String(parsed);
      } catch {
        return '';
      }
    })();

    const paymentStatus =
      latestPayment &&
      ['On-Time Pay', 'Late Pay'].includes(latestPayment.paymentStatus)
        ? 'Paid'
        : 'Unpaid';

    /* ───────── enriched property payload ───────── */
    const transformedProperty = {
      ...property.toJSON(),
      images,
      videoUrl,
      amenities,
      paymentStatus,
      bookingStatus      // <-- shows "Pending", "Approved", "Rejected", or '' (empty)
    };

    /* ─────────────────── reviews section ─────────────────── */
    const reviews = await Review.findAll({
      where: { propertyId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'image'] }]
    });

    /* no reviews */
    if (!reviews.length) {
      return res.status(200).json({
        success: true,
        message: 'Property fetched. No reviews found.',
        data: {
          progress: {
            totalReviews: 0,
            averageRating: '0.0',
            one: 0,
            two: 0,
            three: 0,
            four: 0,
            five: 0
          },
          property: transformedProperty,
          reviews: []
        }
      });
    }

    /* average rating */
    const avgRow = await Review.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
      where: { propertyId },
      raw: true
    });
    const averageRating = parseFloat(avgRow.avgRating || 0).toFixed(1);

    /* star-wise counts */
    const countRows = await Review.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('*')), 'count'],
        [
          sequelize.literal(`CASE
              WHEN rating = 5            THEN '5star'
              WHEN rating BETWEEN 4 AND 4.9 THEN '4star'
              WHEN rating BETWEEN 3 AND 3.9 THEN '3star'
              WHEN rating BETWEEN 2 AND 2.9 THEN '2star'
              ELSE '1star'
            END`),
          'ratingStar'
        ]
      ],
      where: { propertyId },
      group: ['ratingStar'],
      raw: true
    });

    const reviewCounts = { one: 0, two: 0, three: 0, four: 0, five: 0 };
    const mapStar = { '1star': 'one', '2star': 'two', '3star': 'three', '4star': 'four', '5star': 'five' };
    countRows.forEach(({ ratingStar, count }) => {
      if (mapStar[ratingStar]) reviewCounts[mapStar[ratingStar]] = parseInt(count, 10);
    });

    /* flatten reviews */
    const transformedReviews = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      feedback: r.feedback,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        id: r.user?.id,
        name: r.user?.name,
        image: r.user?.image
      }
    }));

    /* ─────────────────── response ─────────────────── */
    return res.status(200).json({
      success: true,
      message: 'Reviews and ratings fetched.',
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred.',
      error: err.message
    });
  }
};

module.exports = { getStarReviews };











const createReview = async (req, res) => {
    try {
        const { propertyId, userId, rating, feedback } = req.body;

        if (!propertyId || !userId || !rating || feedback === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All fields (propertyId, userId, rating, feedback) are required.'
            });
        }

        // Check if property exists and is assigned to the correct user
        const property = await Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({
                success: false,
                message: 'Property not found.'
            });
        }

        if (property.assignedToId !== parseInt(userId)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to review this property.'
            });
        }

        // Check if review already exists for this user and property
        const existingReview = await Review.findOne({
            where: { userId, propertyId }
        });

        // if (existingReview) {
        //     return res.status(409).json({
        //         success: false,
        //         message: 'You have already reviewed this property.'
        //     });
        // }

        const review = await Review.create({ propertyId, userId, rating, feedback });

        res.status(201).json({
            success: true,
            message: 'Review submitted.',
            data: review
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error.',
            error: err.message
        });
    }
};

module.exports = {
    getStarReviews,
    createReview
};
