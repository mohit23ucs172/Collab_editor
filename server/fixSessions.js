// fixAllSessions.js
const mongoose = require("mongoose");
require("dotenv").config();
const Session = require("./models/Session");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

async function fixSessions() {
  const sessions = await Session.find({});
  for (const sess of sessions) {
    if (typeof sess.code === "string") {
      console.log(`Fixing session: ${sess.roomId}`);
      sess.code = {
        javascript: sess.code,
        cpp: "// Loading C++...",
        python: "# Loading Python...",
        java: "// Loading Java..."
      };
      await sess.save();
    }
  }
  console.log("All sessions fixed!");
  mongoose.connection.close();
}

fixSessions().catch(err => {
  console.error(err);
  mongoose.connection.close();
});
