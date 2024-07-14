const meetupService = require("../services/meetupService");
const { json } = require("express");

const {
  meetupSchema,
  delMeetupSchema,
  updateMeetupSchema,
} = require("../dto.js");

const meetupList = async (req, res) => {
  try {
    const meetups = await meetupService.getMeetups();
    if (req.query.page && req.query.limit) {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      return res.status(200).json(meetups.slice(startIndex, endIndex));
    } else {
      return res.status(200).json(meetups);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при поиске доступных митапов.");
  }
};

const getMeetupById = async (req, res) => {
  try {
    const { id } = req.query;
    const meetup = await meetupService.getMeetupById(id);

    if (meetup) {
      res
        .status(200)
        .json({ ...meetup, meetup_id: +meetup.meetup_id.toString() });
    } else {
      res.status(404).send("Митап с данным id не существует.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Произошла ошибка при получении митапа.");
  }
};

const addMeetup = async (req, res) => {
  const { accessToken, name, tags, date, location, description } = req.body;

  const { error, value } = meetupSchema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((detail) => detail.message) });
  }

  try {
    const result = await meetupService.addMeetup(
      accessToken,
      name,
      tags,
      date,
      location,
      description
    );

    switch (result) {
      case "alreadyExists":
        return res.status(400).send("Митап c таким name уже существует.");
      case "accessDenied":
        return res
          .status(403)
          .send("У вас нет прав, чтобы организовать митап.");
      default:
        return res.status(200).send("Митап успешно создан!");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).send("Недействительный токен доступа.");
    } else {
      console.error(error);
      return res.status(500).send("Произошла ошибка при создании митапа.");
    }
  }
};

const updateMeetup = async (req, res) => {
  const { accessToken, id, name, tags, date, location, description } = req.body;

  const { error, value } = updateMeetupSchema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((detail) => detail.message) });
  }

  try {
    const result = await meetupService.updateMeetup(
      name,
      tags,
      date,
      location,
      description,
      id,
      accessToken
    );
    switch (result) {
      case "notFound":
        return res.status(404).send("Митап не найден.");
      case "alreadyExists":
        return res
          .status(401)
          .send("Похоже, митап с таким названием уже существует!");
      case "accessDenied":
        return res
          .status(403)
          .send("У вас нет прав, чтобы редактировать митап.");
      default:
        return res.status(200).send("Митап успешно обновлен!");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).send("Недействительный токен доступа.");
    } else {
      console.error(error);
      return res.status(500).send("Произошла ошибка при обновлении митапа.");
    }
  }
};

const deleteMeetup = async (req, res) => {
  const { id, accessToken } = req.query;

  const { error, value } = delMeetupSchema.validate({ id, accessToken });

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((detail) => detail.message) });
  }

  try {
    const result = await meetupService.deleteMeetup(id, accessToken);
    switch (result) {
      case "notFound":
        return res.status(404).send("Митап не найден.");
      case "accessDenied":
        return res.status(403).send("У вас нет прав, чтобы удалять митап.");
      default:
        return res.send("Митап успешно удален!");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).send("Недействительный токен доступа.");
    } else {
      console.error(error);
      return res.status(500).send("Произошла ошибка при удалении митапа.");
    }
  }
};

const filterByTags = async (req, res) => {
  const { tags } = req.query;
  try {
    let filteredRows = await meetupService.filterByTags(tags);

    return res.json(
      filteredRows.length > 0
        ? filteredRows.map((obj) => {
            return { ...obj, meetup_id: +obj.meetup_id.toString() };
          })
        : "Похоже, митапы c данными тегами отсутсвуют."
    );
  } catch (error) {
    console.log(error);
  }
};

const sortByName = async (req, res) => {
  const { sortByAlphabet, limit, page } = req.query;
  try {
    await meetupService.sortByAlphabet(sortByAlphabet, limit, page, req, res);
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  meetupList,
  getMeetupById,
  addMeetup,
  updateMeetup,
  deleteMeetup,
  filterByTags,
  sortByName,
};
