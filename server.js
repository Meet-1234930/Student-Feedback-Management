const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/feedback_db';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

const feedbackSchema=new mongoose.Schema({
  studentName:{
    type:String,
    required:[true,'Student name is required'],
    trim:true
  },
  courseName:{
    type: String,
    required:[true,'Course name is required'],
    trim:true
  },
  message:{
    type: String,
    required: [true,'Feedback message is required'],
    trim: true
  },
  rating:{
    type:Number,
    required:[true,'Rating is required'],
    min: [1,'Rating must be at least 1'],
    max: [5,'Rating cannot exceed 5']
  },
  status:{
    type: String,
    enum:['Pending','Reviewed'],
    default:'Pending'
  }
}, {
  timestamps:true
});

const Feedback=mongoose.model('Feedback',feedbackSchema);

// ==========================================
// SUBTASK 1: Submit Student Feedback
// POST /api/feedback
// ==========================================
app.post('/api/feedback', async (req, res) => {
  try {
    const { studentName, courseName, message, rating } = req.body;

    // Create and save new feedback record
    const feedback = new Feedback({
      studentName,
      courseName,
      message,
      rating
    });

    const savedFeedback = await feedback.save();
    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: savedFeedback
    });
  } catch (error) {
    if (error.name==='ValidationError') {
      const messages = Object.values(error.errors).map(val=>val.message);
      return res.status(400).json({success:false,error:messages});
    }
    return res.status(500).json({success:false,error:'Internal Server Error' });
  }
});

// ==========================================
// SUBTASK 2: Retrieve Feedback with Pagination
// GET /api/feedback?page=1&limit=5
// ==========================================
app.get('/api/feedback', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const [records, totalRecords] = await Promise.all([
      Feedback.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Feedback.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      currentPage: page,
      limit,
      totalPages: Math.ceil(totalRecords/limit),
      totalRecords,
      data: records
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.patch('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status||!['Pending','Reviewed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or missing status. Allowed values are "Pending" or "Reviewed".' 
      });
    }
    const updatedFeedback = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true,runValidators:true }
    );

    if (!updatedFeedback) {
      return res.status(404).json({success:false,error:'Feedback record not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback status updated successfully',
      data: updatedFeedback
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid feedback ID format' });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});