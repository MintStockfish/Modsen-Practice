const Joi = require("joi");

const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().required(),
  email: Joi.string()
    .email({ tlds: { allow: ["com", "net", "org", "edu", "gov", "ru"] } })
    .max(255)
    .required(),
});

const meetupSchema = Joi.object({
  accessToken: Joi.string().min(30).required(),
  name: Joi.string().min(3).max(30).required(),
  tags: Joi.string().min(3).max(65).required(),
  date: Joi.string().min(3).max(30).required(),
  location: Joi.string().min(3).max(105).required(),
  description: Joi.string().max(225).required(),
});

const updateMeetupSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  accessToken: Joi.string().min(30).required(),
  name: Joi.string().min(3).max(30).required(),
  tags: Joi.string().min(3).max(65).required(),
  date: Joi.string().min(3).max(30).required(),
  location: Joi.string().min(3).max(105).required(),
  description: Joi.string().max(225).required(),
});

const delMeetupSchema = Joi.object({
  accessToken: Joi.string().min(30).required(),
  id: Joi.number().integer().required(),
});

module.exports = {
  userSchema,
  meetupSchema,
  delMeetupSchema,
  updateMeetupSchema,
};
