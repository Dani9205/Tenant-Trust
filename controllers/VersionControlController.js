const VersionControl=require('../models/VersionControl ') // Adjust the path as per your setup

// POST: Add a new version
exports.addVersion = async (req, res) => {
    const { deviceType, versionNumber, status, releaseDate, description } = req.body;

    try {
        const newVersion = await VersionControl.create({
            deviceType,
            versionNumber,
            status,
            releaseDate,
            description,
        });

        res.status(201).json({
            success: true,
            message: 'Version added successfully',
            data: newVersion,
        });
    } catch (error) {
        console.error('Error adding version:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

exports.checkVersion = async (req, res) => {
    const { deviceType, versionNumber } = req.body;

    try {
        // Find the version user is checking
        const checkedVersion = await VersionControl.findOne({
            where: { deviceType, versionNumber },
        });

        if (!checkedVersion) {
            return res.status(404).json({
                success: false,
                message: 'The specified version does not exist.',
            });
        }

        // Find the latest version (could be stable or latest)
        const latestVersion = await VersionControl.findOne({
            where: { deviceType, status: 'latest' },
            order: [['releaseDate', 'DESC']],
        });

        return res.status(200).json({
            success: true,
            message: 'Version information fetched successfully.',
            data: {
                releaseDate: checkedVersion.releaseDate,
                currentVersionStatus : checkedVersion.status,
                latestVersion: latestVersion ? latestVersion.versionNumber : versionNumber, 
            },
        });

    } catch (error) {
        console.error('Error checking version:', error.message);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};







// // GET: Get versions with pagination
// exports.getVersions = async (req, res) => {
//     const { page = 1 } = req.body; // Default to page 1
//     const limit = 2; // Items per page
//     const offset = (page - 1) * limit;

//     try {
//         const { rows: versions, count: totalItems } = await VersionControl.findAndCountAll({
//             limit,
//             offset,
//             order: [['releaseDate', 'DESC']], // Order by releaseDate in descending order
//         });

//         const totalPages = Math.ceil(totalItems / limit);

//         res.status(200).json({
//             success: true,
//             message: 'Versions retrieved successfully',
//             data: {
//                 currentPage: Number(page),
//                 totalPages,
//                 totalItems,
//                 versions,
//             },
//         });
//     } catch (error) {
//         console.error('Error retrieving versions:', error.message);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error',
//         });
//     }
// };

// GET: Check if the current version is outdated and suggest an update

// GET: Check if the current version is outdated and suggest an update




// // PUT: Update status by ID
// exports.updateStatusById = async (req, res) => {
//     const { id } = req.body; // ID from URL parameter
//     const { status } = req.body; // New status from request body

//     try {
//         // Find the version by ID
//         const version = await VersionControl.findByPk(id);

//         if (!version) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Version not found',
//             });
//         }

//         // Update the status
//         version.status = status;
//         await version.save();

//         res.status(200).json({
//             success: true,
//             message: 'Status updated successfully',
//             data: version,
//         });
//     } catch (error) {
//         console.error('Error updating status:', error.message);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error',
//         });
//     }
// };
