const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  javascript: { type: String, default: "// Loading JavaScript..." },
  cpp: { type: String, default: "// Loading C++..." },
  python: { type: String, default: "# Loading Python..." },
  java: { type: String, default: "// Loading Java..." },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Session", SessionSchema);
