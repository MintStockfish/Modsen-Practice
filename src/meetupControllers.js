const jwt = require("jsonwebtoken");
const db = require("../db_config");
const {
  meetupSchema,
  delMeetupSchema,
  updateMeetupSchema,
} = require("./dto.js");

class MeetupService {
  static async getAllMeetups() {
    return db.query("SELECT * FROM meetup_api.meetup_info");
  }

  static async getMeetupsById(meetupId) {
    return db.query(
      "SELECT * FROM meetup_api.meetup_info WHERE meetup_id = $1",
      [meetupId]
    );
  }

  static async getMeetupByName(name) {
    return db.query("SELECT * FROM meetup_api.meetup_info WHERE name = $1", [
      name,
    ]);
  }

  static async addMeetup(name, tags, date, location, description) {
    return await db.query(
      "INSERT INTO meetup_api.meetup_info (name, tags, date, location, description) VALUES ($1, $2, $3, $4, $5)",
      [name, tags, date, location, description]
    );
  }

  static async updateMeetup(name, tags, date, location, description, id) {
    return db.query(
      "UPDATE meetup_api.meetup_info SET name = $1, tags = $2, date = $3, location = $4, description = $5 WHERE meetup_id = $6",
      [name, tags, date, location, description, id]
    );
  }

  static async deleteMeetup(id) {
    return db.query("DELETE FROM meetup_api.meetup_info WHERE meetup_id = $1", [
      id,
    ]);
  }
}

const meetupList = async (req, res) => {
  try {
    const { rows } = await MeetupService.getAllMeetups();

    if (req.query.page && req.query.limit) {
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      return res.status(200).json(rows.slice(startIndex, endIndex));
    } else {
      return res.status(200).json(rows);
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
    const { rows } = await MeetupService.getMeetupsById(meetupId);

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
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
      if (existingMeetupByName.rows.length > 0) {
        return res.status(400).send("Митап c таким name уже существует.");
      }
      MeetupService.addMeetup(name, tags, date, location, description);

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

      if (existingMeetup.rows.length === 0) {
        return res.status(404).send("Митап не найден.");
      }

      if ((await MeetupService.getMeetupByName(name)).rows.length > 0) {
        return res
          .status(401)
          .json("Похоже, митап с таким названием уже существует!");
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

      if (existingMeetup.rows.length === 0) {
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

  const unfilteredRows = (await MeetupService.getAllMeetups()).rows;
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
      ? filteredRows
      : "Похоже, митапы c данными тегами отсутсвуют."
  );
};

const sortByName = async (req, res) => {
  const { sortByAlphabet, limit = 10, offset = 0 } = req.query;

  const query = `
      SELECT *
      FROM meetup_api.meetup_info
      ORDER BY name ASC
      LIMIT $1
      OFFSET $2
    `;

  const sorted = await db.query(query, [limit, offset]);

  if (sortByAlphabet === "1") {
    return res.status(200).json(sorted.rows);
  } else if (sortByAlphabet === "-1") {
    return res.status(200).json(sorted.rows.reverse());
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
