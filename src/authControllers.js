const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db_config.js");

const { userSchema } = require("./dto.js");

class User {
  static async getUserByEmail(email) {
    const result = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE email = $1",
      [email]
    );
    return result.rows[0];
  }

  static async getUserByUsername(username) {
    const result = await db.query(
      "SELECT * FROM meetup_api.user_info WHERE username = $1",
      [username]
    );
    return result.rows[0];
  }

  static async createUser(username, password, email, role) {
    await db.query(
      "INSERT INTO meetup_api.user_info (username, password, email) VALUES ($1, $2, $3)",
      [username, password, email]
    );
  }

  static async updateRefreshToken(userId, refreshToken) {
    await db.query(
      "UPDATE meetup_api.user_info SET refresh_token = $1 WHERE user_id = $2",
      [refreshToken, userId]
    );
  }

  static async assignAdminRole(username) {
    const result = await db.query(
      "UPDATE meetup_api.user_info SET roles = $1 WHERE username = $2",
      ["Admin", username]
    );
    return result.rowCount;
  }
}

const register = async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ error: error.details.map((detail) => detail.message) });
    }

    const { username, password, email, admin } = value;

    if (await User.getUserByEmail(email)) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким email уже существует" });
    }

    if (await User.getUserByUsername(username)) {
      return res
        .status(400)
        .json({ error: "Пользователь c таким username уже существует" });
    }

    const hashedPassword = await bcrypt.hash(password, +process.env.SALT);
    await User.createUser(
      username,
      hashedPassword,
      email,
      admin == "true" ? "Admin" : null
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

    const user = await User.getUserByUsername(username);

    if (!user) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).send("Неверный логин или пароль.");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await User.updateRefreshToken(user.user_id, refreshToken);

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

const assignAdmin = async (req, res) => {
  const { username, accessToken } = req.body;

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    if (decoded.role === "Admin") {
      const result = await User.assignAdminRole(username);

      if (result === 0) {
        return res.status(404).send("Пользователь не найден.");
      } else {
        return res.status(200).send("Роль успешно назначена!");
      }
    } else {
      return res.status(403).send("У вас нет прав, чтобы выдать роль.");
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).send("Недействительный токен доступа.");
    } else {
      console.error(error);
      return res.status(500).send("Ошибка при назначении роли.");
    }
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

const generateRefreshToken = (user) => {
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

module.exports = {
  register,
  login,
  assignAdmin,
};
