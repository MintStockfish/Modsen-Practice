const authService = require("../services/authService");

const { userSchema } = require("../dto.js");

const register = async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ error: error.details.map((detail) => detail.message) });
    }

    const { username, password, email } = value;

    const result = await authService.registerUser(username, password, email);
    if (result == "usernameConflict") {
      return res.status(409).json({
        message: "Пользователь с таким именем уже существует.",
      });
    }
    if (result == "emailConflict") {
      return res.status(409).json({
        message: "Пользователь с такой почтой уже существует.",
      });
    }

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
    const { accessToken, refreshToken } = await authService.loginUser(
      username,
      password
    );
    if (!accessToken) {
      res.status(401).send("Неверный логин или пароль.");
    } else {
      res.status(201).json({
        message: "Вы успешно авторизировались!",
        accessToken,
        refreshToken,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка во время авторизации" });
  }
};

const assignAdmin = async (req, res) => {
  try {
    const { username, accessToken } = req.body;
    const result = await authService.assignAdmin(username, accessToken);
    if (result == "assignError") {
      return res.status(403).send("У вас нет прав, чтобы выдать роль.");
    } else {
      return res.status(200).send("Роль успешно назначена!");
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

module.exports = {
  register,
  login,
  assignAdmin,
};
