const Joi = require("joi");
const db = require("../db_config");
const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const register = async (req, res) => {
  try {
    const schema = Joi.object({
      username: Joi.string().min(3).max(30).required(),
      password: Joi.string().required(),
      email: Joi.string()
        .email({ tlds: { allow: ["com", "net", "org", "edu", "gov", "ru"] } })
        .max(255)
        .required(),
      admin: Joi.string().valid("true", "false").required(),
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ error: error.details.map((detail) => detail.message) });
    }

    const { username, password, email, admin } = value;

    const existingUserByEmail = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE email = $1",
      [email]
    );
    console.log;
    if (existingUserByEmail.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким email уже существует" });
    }

    const existingUserByUsername = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE username = $1",
      [username]
    );
    if (existingUserByUsername.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким username уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO meetup_api.user_info (username, password, email, roles) VALUES ($1, $2, $3, $4)",
      [username, hashedPassword, email, admin == "true" ? "Admin" : null]
    );

    res.status(201).json({ message: "Пользователь успешно зарегистрирован" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Произошла ошибка при регистрации пользователя" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE username = $1",
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await db.query(
      "UPDATE meetup_api.user_info SET refresh_token = $1 WHERE user_id = $2",
      [refreshToken, user.user_id]
    );

    res.status(201).json({
      message: "Вы успешно авторизировались.",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка во время авторизации" });
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION }
  );
};

const generateRefreshToken = (user, role) => {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.roles,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
  );
};

const meetupList = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM meetup_api.meetup_info");

    const pageSize = 5;
    let pageNumber = 1;
    let meetupOutput = "";

    for (let i = 0; i < rows.length; i += pageSize) {
      const page = rows.slice(i, i + pageSize);

      meetupOutput += `Page ${pageNumber}:\n\n`;

      for (const elem of page) {
        meetupOutput += `ID: ${elem.meetup_id}\nName: ${elem.name}\nTags: ${elem.tags}\nDate: ${elem.date}\nLocation: ${elem.location}\nDescription: ${elem.description}\n\n`;
      }

      meetupOutput += "\n";
      pageNumber++;
    }

    res.status(200).send(meetupOutput);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при поиске доступных митапов.");
  }
};

const getMeetupById = async (req, res) => {
  const { id } = req.query;
  const meetupId = BigInt(id);

  try {
    const { rows } = await db.query(
      "SELECT * FROM meetup_api.meetup_info WHERE meetup_id = $1",
      [meetupId]
    );

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

  const schema = Joi.object({
    accessToken: Joi.string().min(30).required(),
    name: Joi.string().min(3).max(30).required(),
    tags: Joi.string().min(3).max(65).required(),
    date: Joi.string().min(3).max(30).required(),
    location: Joi.string().min(3).max(105).required(),
    description: Joi.string().max(225).required(),
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((detail) => detail.message) });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.role === "Admin") {
      const existingMeetupByName = await db.query(
        "SELECT * FROM meetup_api.meetup_info WHERE name = $1",
        [name]
      );
      if (existingMeetupByName.rows.length > 0) {
        return res.status(400).send("Митап c таким name уже существует.");
      }
      await db.query(
        "INSERT INTO meetup_api.meetup_info (name, tags, date, location, description) VALUES ($1, $2, $3, $4, $5)",
        [name, tags, date, location, description]
      );

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

  const schema = Joi.object({
    accessToken: Joi.string().min(30).required(),
    id: Joi.number().integer().required(),
    name: Joi.string().min(3).max(30).required(),
    tags: Joi.string().min(3).max(30).required(),
    date: Joi.string().min(3).max(30).required(),
    location: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(225).required(),
  });

  const { error, value } = schema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((detail) => detail.message) });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (decoded.role === "Admin") {
      const existingMeetup = await db.query(
        "SELECT * FROM meetup_api.meetup_info WHERE meetup_id = $1",
        [id]
      );

      if (existingMeetup.rows.length === 0) {
        return res.status(404).send("Митап не найден.");
      }

      await db.query(
        "UPDATE meetup_api.meetup_info SET name = $1, tags = $2, date = $3, location = $4, description = $5 WHERE meetup_id = $6",
        [name, tags, date, location, description, id]
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

  const schema = Joi.object({
    accessToken: Joi.string().min(30).required(),
    id: Joi.number().integer().required(),
  });

  const { error, value } = schema.validate({ id, accessToken });

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((detail) => detail.message) });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    if (decoded.role === "Admin") {
      const existingMeetup = await db.query(
        "SELECT * FROM meetup_api.meetup_info WHERE meetup_id = $1",
        [id]
      );

      if (existingMeetup.rows.length === 0) {
        return res.status(404).send("Митап не найден.");
      }

      await db.query(
        "DELETE FROM meetup_api.meetup_info WHERE meetup_id = $1",
        [id]
      );

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

  const unfilteredRows = (
    await db.query("SELECT * FROM meetup_api.meetup_info")
  ).rows;
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
  register,
  login,
  meetupList,
  getMeetupById,
  addMeetup,
  updateMeetup,
  deleteMeetup,
  filterByTags,
  sortByName,
};
