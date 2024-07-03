const express = require("express");
const router = express.Router();
const app = express();

const {
  register,
  login,
  meetupList,
} = require("../controllers/serverControllers");

router.post("/register", register);
router.post("/login", login);
router.get("/meetupList", meetupList);

module.exports = router;
