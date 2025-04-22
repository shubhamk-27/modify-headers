const express = require("express");
const app = express();

// Block CORS for testing
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", null); // Explicitly blocks requests
  next();
});

app.get("/data", (req, res) => {
  res.json({ message: "Hello, this is a CORS test!" });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
