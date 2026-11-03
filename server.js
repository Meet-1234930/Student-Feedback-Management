
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/feedback_db')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    courseName: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Feedback message is required'],
        trim: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed'],
        default: 'Pending'
    }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);


// 1. Submit Feedback
app.post('/api/feedback', async (req, res) => {
    try {
        const feedback = new Feedback(req.body);
        const data = await feedback.save();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: data
        });

    } catch (err) {
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: errors
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});


// 2. Get Feedback with Pagination
app.get('/api/feedback', async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 5;

        const data = await Feedback.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Feedback.countDocuments();

        res.status(200).json({
            success: true,
            currentPage: page,
            limit: limit,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            data: data
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});


// 3. Update Feedback Status
app.patch('/api/feedback/:id', async (req, res) => {
    try {
        const status = req.body.status;

        if (!['Pending', 'Reviewed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or missing status. Allowed values are "Pending" or "Reviewed".'
            });
        }

        const data = await Feedback.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true, runValidators: true }
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Feedback record not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Feedback status updated successfully',
            data: data
        });

    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid feedback ID format'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal Server Error'
        });
    }
});


// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
