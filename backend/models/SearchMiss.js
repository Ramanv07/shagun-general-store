import mongoose from 'mongoose';

const searchMissSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
    index: true
  },
  count: {
    type: Number,
    default: 1,
    min: 1
  },
  lastSearchedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

export default mongoose.models.SearchMiss || mongoose.model('SearchMiss', searchMissSchema);
