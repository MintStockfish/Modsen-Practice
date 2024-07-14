const meetupRepositories = require("../repositories/meetupRepository");

const jwt = require("jsonwebtoken");

const getMeetups = async () => {
  let meetups = await meetupRepositories.getAllMeetups();
  return (meetups = meetups.map((obj) => {
    return { ...obj, meetup_id: +obj.meetup_id.toString() };
  }));
};

const getMeetupById = async (id) => {
  const meetupId = BigInt(id);
  return await meetupRepositories.getMeetupById(meetupId);
};

const addMeetup = async (
  accessToken,
  name,
  tags,
  date,
  location,
  description
) => {
  const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

  if (decoded.role === "Admin") {
    const existingMeetupByName = await meetupRepositories.getMeetupByName(name);
    if (existingMeetupByName) return "alreadyExists";
    await meetupRepositories.addMeetup(name, tags, date, location, description);
  } else {
    return "accessDenied";
  }
};

const updateMeetup = async (name, tags, date, location, description, id, accessToken) => {
  const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  if (decoded.role === "Admin") {
    const existingMeetup = await meetupRepositories.getMeetupById(id);

    if (!existingMeetup) {
      return "notFound";
    }

    if (await meetupRepositories.getMeetupByName(name)) {
      return "alreadyExists";
    }

    await meetupRepositories.updateMeetup(
      name,
      tags,
      date,
      location,
      description,
      id
    );
  } else {
    return "accessDenied";
  }
};

const deleteMeetup = async (id, accessToken) => {
  const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
  if (decoded.role === "Admin") {
    const existingMeetup = await meetupRepositories.getMeetupById(id);

    if (!existingMeetup) {
      return "notFound";
    }

    await meetupRepositories.deleteMeetup(id);
  } else {
    return "accessDenied";
  }
};

const filterByTags = async (tags) => {
  const unfilteredRows = await meetupRepositories.getAllMeetups();
  const filteredRows = new Array();

  const setTags = new Set(tags.replace(/\s/g, "").split(","));
  unfilteredRows.forEach((elem) => {
    const elemTags = elem.tags.replace(/\s/g, "").split(",");
    if (elemTags.some((item) => setTags.has(item))) {
      filteredRows.push(elem);
    }
  });
  return filteredRows;
};

const sortByAlphabet = async (sortByAlphabet, limit, page, req, res) => {
  const meetups = await meetupRepositories.getAllMeetups();

  if (sortByAlphabet === "1") {
    if (req.query.page && req.query.limit) {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      return res.status(200).json(
        meetups
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(startIndex, endIndex)
          .map((obj) => {
            return { ...obj, meetup_id: +obj.meetup_id.toString() };
          })
      );
    } else {
      return res.status(200).json(
        meetups
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((obj) => {
            return { ...obj, meetup_id: +obj.meetup_id.toString() };
          })
      );
    }
  } else if (sortByAlphabet === "-1") {
    if (req.query.page && req.query.limit) {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      return res.status(200).json(
        meetups
          .sort((a, b) => b.name.localeCompare(a.name))
          .slice(startIndex, endIndex)
          .map((obj) => {
            return { ...obj, meetup_id: +obj.meetup_id.toString() };
          })
      );
    } else {
      return res.status(200).json(
        meetups
          .sort((a, b) => b.name.localeCompare(a.name))
          .map((obj) => {
            return { ...obj, meetup_id: +obj.meetup_id.toString() };
          })
      );
    }
  } else {
    return res.status(400).json({ error: "Некорретный выбор" });
  }
};
module.exports = {
  getMeetups,
  getMeetupById,
  addMeetup,
  updateMeetup,
  deleteMeetup,
  filterByTags,
  sortByAlphabet,
};
