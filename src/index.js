const dotenv = require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());
app.use("/", require("../routes/serverRoutes"));

app.listen(process.env.PORT || 4111, () => {
  console.log("server running on port", process.env.PORT);
});
