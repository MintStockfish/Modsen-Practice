const dotenv = require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use("/", require("./routes/serverRoutes"));

app.listen(process.env.PORT | 4111, () => {
  console.log("server running on port", process.env.PORT);
});
