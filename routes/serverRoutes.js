const express = require("express");
const router = express.Router();
const app = express();

const {
  register,
  login,
  meetupList,
  getMeetupById,
  addMeetup,
  updateMeetup,
  deleteMeetup,
  filterByTags,
  sortByName,
} = require("../controllers/serverControllers");

router.post("/register", register);
router.post("/login", login);
router.get("/meetupList", meetupList);
router.get("/getMeetupById", getMeetupById);
router.post("/addMeetup", addMeetup);
router.put("/updateMeetup", updateMeetup);
router.delete("/deleteMeetup", deleteMeetup);
router.get("/filterByTags", filterByTags);
router.get("/sortByName", sortByName);

module.exports = router;
