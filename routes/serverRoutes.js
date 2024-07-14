const express = require("express");
const router = express.Router();
const app = express();

const {
  meetupList,
  getMeetupById,
  addMeetup,
  updateMeetup,
  deleteMeetup,
  filterByTags,
  sortByName,
} = require("../src/controllers/meetupControllers");

const {
  register,
  login,
  assignAdmin,
} = require("../src/controllers/authControllers");

router.post("/register", register);
router.post("/login", login);

router.get("/meetupList", meetupList);
router.get("/getMeetupById", getMeetupById);
router.get("/filterByTags", filterByTags);
router.get("/sortByName", sortByName);

router.post("/addMeetup", addMeetup);
router.put("/updateMeetup", updateMeetup);
router.delete("/deleteMeetup", deleteMeetup);

router.post("/assignAdmin", assignAdmin);

module.exports = router;
