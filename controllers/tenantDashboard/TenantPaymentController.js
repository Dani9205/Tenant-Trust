const TenantPayment = require("../../models/TenantPayment");
const Property = require("../../models/PropertyModel");
const fs = require("fs");
const path = require("path");

// Function to add a tenant payment
exports.addTenantPayment = async (req, res) => {
    try {
        const { title, rentPaidDate, description, paymentStatus, propertyId } = req.body;
        const image = req.file ? req.file.filename : null; // Store file name

        if (!propertyId) {
            return res.status(400).json({ success: false, message: "Property ID is required." });
        }

        // Check if property exists
        const property = await Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({ success: false, message: "Property not found." });
        }

        // Create a new tenant payment record
        const payment = await TenantPayment.create({
            title,
            rentPaidDate,
            description,
            paymentStatus,
            propertyId,
            image,
        });

        // Format property details
        const formattedProperty = {
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
            paymentStatus: property.paymentStatus,

            // Parsing and formatting images
            images: (() => {
                try {
                    if (!property.images || property.images === "") return "";
                    let cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                    let parsedImages = JSON.parse(cleanedImages);
                    return Array.isArray(parsedImages)
                        ? parsedImages.map(image => (typeof image === "string" ? image : image.filename)).join(",")
                        : "";
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


            // Parsing and formatting amenities
            amenities: (() => {
                try {
                    if (!property.amenities || property.amenities === "") return "";
                    let parsedAmenities = JSON.parse(property.amenities);
                    return Array.isArray(parsedAmenities)
                        ? parsedAmenities.map(item => item.replace(/\\+/g, "").replace(/^"|"$/g, "").trim()).join(",")
                        : "";
                } catch (error) {
                    console.error("Error parsing amenities:", error);
                    return "";
                }
            })(),
        };

        res.status(201).json({
            success: true,
            message: "Tenant payment added successfully.",
            data: {
                ...payment.toJSON(),
                property: formattedProperty,
            },
        });
    } catch (error) {
        console.error("Error adding tenant payment:", error);
        res.status(500).json({ success: false, message: "Failed to add payment.", error: error.message });
    }
};



// Function to get all payment history by property ID
exports.getPaymentsByPropertyId = async (req, res) => {
    try {
        const { propertyId } = req.body;

        if (!propertyId) {
            return res.status(400).json({ success: false, message: "Property ID is required." });
        }

        // Fetch payments for the property
        const payments = await TenantPayment.findAll({ where: { propertyId } });

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

// Function to re-upload/update a payment record


exports.reuploadTenantPayment = async (req, res) => {
    try {
        const { id, title, rentPaidDate, description, paymentStatus, propertyId } = req.body;
        const newImage = req.file ? req.file.filename : null;

        const payment = await TenantPayment.findByPk(id, {
            include: [
                {
                    model: Property,
                    as: "property",
                },
            ],
        });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found." });
        }
        
        // ❗ Prevent changing property ID
        if (propertyId && propertyId != payment.propertyId) {
            return res.status(400).json({
                success: false,
                message: "Cannot change the associated property for this payment."
            });
        }
        

        // Delete old image if a new one is uploaded
        if (newImage && payment.image) {
            const oldImagePath = path.join(__dirname, "../uploads", payment.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update the payment record
        await payment.update({
            title: title || payment.title,
            rentPaidDate: rentPaidDate || payment.rentPaidDate,
            description: description || payment.description,
            paymentStatus: paymentStatus || payment.paymentStatus,
            image: newImage || payment.image,
        });

        // Format property details
        const property = payment.property;
        const formattedProperty = property
            ? {
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
                  paymentStatus: property.paymentStatus,

                  // Parsing and formatting images
                  images: (() => {
                      try {
                          if (!property.images || property.images === "") {
                              return "";
                          }

                          let imageList;
                          if (typeof property.images === "string") {
                              const cleanedImages = property.images
                                  .replace(/^"|"$/g, "")
                                  .replace(/\\"/g, '"');

                              const parsedImages = JSON.parse(cleanedImages);
                              if (Array.isArray(parsedImages)) {
                                  imageList = parsedImages
                                      .map((image) => (typeof image === "string" ? image : image.filename))
                                      .filter(Boolean)
                                      .join(",");
                              } else {
                                  imageList = "";
                              }
                          } else {
                              imageList = "";
                          }
                          return imageList;
                      } catch (error) {
                          console.error("Error parsing images:", error.message);
                          return "";
                      }
                  })(),

                  // Parsing and formatting videoUrl (Return only filename)
                  videoUrl: (() => {
                      try {
                          if (!property.videoUrl || property.videoUrl === "") {
                              return null;
                          }

                          if (typeof property.videoUrl === "string") {
                              const cleanedVideo = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                              if (cleanedVideo.startsWith("{")) {
                                  const parsedVideo = JSON.parse(cleanedVideo);
                                  return parsedVideo.filename ? parsedVideo.filename : null;
                              }
                              return cleanedVideo;
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
                                      .map((item) => item.replace(/\\+/g, "").replace(/^"|"$/g, "").trim())
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
              }
            : null;

        res.status(200).json({
            success: true,
            message: "Tenant payment updated successfully.",
            data: {
                id: payment.id,
                image: payment.image,
                title: payment.title,
                rentPaidDate: payment.rentPaidDate,
                description: payment.description,
                paymentStatus: payment.paymentStatus,
                propertyId: payment.propertyId,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                property: formattedProperty,
            },
        });
    } catch (error) {
        console.error("Error updating tenant payment:", error);
        res.status(500).json({ success: false, message: "Failed to update payment.", error: error.message });
    }
};


// Function to get a single tenant payment by ID
exports.getSinglePaymentById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Payment ID is required." });
        }

        // Find payment by ID with property details
        const payment = await TenantPayment.findByPk(id, {
            include: [
                {
                    model: Property,
                    as: "property",
                },
            ],
        });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found." });
        }

        const property = payment.property;
        const formattedProperty = property
            ? {
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
                  paymentStatus: property.paymentStatus,

                  // Parsing images
                  images: (() => {
                      try {
                          if (!property.images || property.images === "") return "";
                          const cleanedImages = property.images.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                          const parsed = JSON.parse(cleanedImages);
                          return Array.isArray(parsed)
                              ? parsed.map(img => (typeof img === "string" ? img : img.filename)).join(",")
                              : "";
                      } catch (err) {
                          console.error("Image parse error:", err);
                          return "";
                      }
                  })(),

                  // Parsing video
                  videoUrl: (() => {
                      try {
                          if (!property.videoUrl || property.videoUrl === "") return null;
                          const cleaned = property.videoUrl.replace(/^"|"$/g, "").replace(/\\"/g, '"');
                          if (cleaned.startsWith("{")) {
                              const parsed = JSON.parse(cleaned);
                              return parsed.filename || null;
                          }
                          return cleaned;
                      } catch (err) {
                          console.error("Video parse error:", err);
                          return null;
                      }
                  })(),

                  // Parsing amenities
                  amenities: (() => {
                      try {
                          if (!property.amenities || property.amenities === "") return "";
                          const parsed = JSON.parse(property.amenities);
                          return Array.isArray(parsed)
                              ? parsed.map(item => item.replace(/\\+/g, "").replace(/^"|"$/g, "").trim()).join(",")
                              : "";
                      } catch (err) {
                          console.error("Amenities parse error:", err);
                          return "";
                      }
                  })(),
              }
            : null;

        return res.status(200).json({
            success: true,
            message: "Payment details retrieved successfully.",
            data: {
                id: payment.id,
                image: payment.image,
                title: payment.title,
                rentPaidDate: payment.rentPaidDate,
                description: payment.description,
                paymentStatus: payment.paymentStatus,
                propertyId: payment.propertyId,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                property: formattedProperty,
            },
        });
    } catch (error) {
        console.error("Error fetching single payment:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve payment details.", error: error.message });
    }
};
