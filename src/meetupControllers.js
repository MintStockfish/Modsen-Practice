const jwt = require("jsonwebtoken");
const db = require("../db_config");
const {
  meetupSchema,
  delMeetupSchema,
  updateMeetupSchema,
} = require("./dto.js");

const { PrismaClient } = require("@prisma/client");
const { json } = require("express");
const prisma = new PrismaClient();

class MeetupService {
  static async getAllMeetups() {
    return prisma.meetup_info.findMany();
  }

  static async getMeetupsById(meetupId) {
    return prisma.meetup_info.findUnique({
      where: {
        meetup_id: meetupId,
      },
    });
  }

  static async getMeetupByName(name) {
    return prisma.meetup_info.findMany({
      where: {
        name,
      },
    });
  }

  static async addMeetup(name, tags, date, location, description) {
    return prisma.meetup_info.create({
      data: {
        name,
        tags,
        date,
        location,
        description,
      },
    });
  }

  static async updateMeetup(name, tags, date, location, description, id) {
    return prisma.meetup_info.update({
      where: {
        meetup_id: id,
      },
      data: {
        name,
        tags,
        date,
        location,
        description,
      },
    });
  }

  static async deleteMeetup(id) {
    return prisma.meetup_info.delete({
      where: {
        meetup_id: id,
      },
    });
  }
}

const meetupList = async (req, res) => {
  try {
    let meetups = await MeetupService.getAllMeetups();
    meetups = meetups.map((obj) => {
      return { ...obj, meetup_id: +obj.meetup_id.toString() };
    });
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
  const { id } = req.query;
  const meetupId = BigInt(id);

  try {
    const meetup = await MeetupService.getMeetupsById(meetupId);

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
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.role === "Admin") {
      const existingMeetupByName = await MeetupService.getMeetupByName(name);
      if (existingMeetupByName[0]) {
        return res.status(400).send("Митап c таким name уже существует.");
      }
      await MeetupService.addMeetup(name, tags, date, location, description);

      return res.status(200).send("Митап успешно создан!");
    } else {
      return res.status(403).send("У вас нет прав, чтобы организовать митап.");
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
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (decoded.role === "Admin") {
      const existingMeetup = await MeetupService.getMeetupsById(id);

      if (!existingMeetup) {
        return res.status(404).send("Митап не найден.");
      }

      if (await MeetupService.getMeetupByName(name)[0]) {
        return res
          .status(401)
          .send("Похоже, митап с таким названием уже существует!");
      }

      await MeetupService.updateMeetup(
        name,
        tags,
        date,
        location,
        description,
        id
      );

      return res.send("Митап успешно обновлен!");
    } else {
      return res.status(403).send("У вас нет прав, чтобы редактировать митап.");
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
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (decoded.role === "Admin") {
      const existingMeetup = await MeetupService.getMeetupsById(id);

      if (!existingMeetup) {
        return res.status(404).send("Митап не найден.");
      }

      await MeetupService.deleteMeetup(id);

      return res.send("Митап успешно удален!");
    } else {
      return res.status(403).send("У вас нет прав, чтобы удалять митап.");
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

  const unfilteredRows = await MeetupService.getAllMeetups();
  const filteredRows = new Array();

  const setTags = new Set(tags.replace(/\s/g, "").split(","));
  unfilteredRows.forEach((elem) => {
    const elemTags = elem.tags.replace(/\s/g, "").split(",");
    if (elemTags.some((item) => setTags.has(item))) {
      filteredRows.push(elem);
    }
  });

  return res.json(
    filteredRows.length > 0
      ? filteredRows.map((obj) => {
          return { ...obj, meetup_id: +obj.meetup_id.toString() };
        })
      : "Похоже, митапы c данными тегами отсутсвуют."
  );
};

const sortByName = async (req, res) => {
  const { sortByAlphabet, limit = 5, page = 1 } = req.query;

  const meetups = await MeetupService.getAllMeetups();

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
    return res.status(200).json(
      meetups
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(page, page + limit)
        .map((obj) => {
          return { ...obj, meetup_id: +obj.meetup_id.toString() };
        })
    );
  } else {
    return res.status(400).json({ error: "Некорретный выбор" });
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
