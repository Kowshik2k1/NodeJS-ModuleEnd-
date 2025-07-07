const express = require('express');
const app = express();
const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

// Middleware setup
app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Logging middleware
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};
app.use(requestLogger);

// JWT Auth Middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(403);
  }
}

const users = [];

app.post('/register', async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  users.push({ username: req.body.username, password: hashed });
  res.status(201).json({"message": "User registered successfully"});
});

app.post('/login', async (req, res) => {
  const user = users.find(u => u.username === req.body.username);
  if (!user || !await bcrypt.compare(req.body.password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get('/protected', auth, (req, res) => res.send('Protected route'));

// MongoDB Connection
mongoose.connect(process.env.URL)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

const Item = mongoose.model('Item', new mongoose.Schema({
  name: { type: String, required: true }
}));

// Express-validator error middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// In-memory item store
let items = [
  { id: 1, name: 'Mahabaratham', description: 'A tale of Dharma yudha' },
  { id: 2, name: 'Ramayanam', description: 'A mythological story of lord Rama' },
  { id: 3, name: 'Item 3', description: 'Description of Item 3' }
];
let nextId = 4;

// Routes
app.get("/", (req, res) => {
  res.send("Hello to NodeJS");
});

app.get("/items", (req, res) => {
  res.json(items);
});

app.get("/items/:id", (req, res) => {
  const itemID = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === itemID);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json(item);
});

app.post("/items", [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isString().withMessage('Name must be a string')
    .isLength({ max: 25 }).withMessage('Name must not exceed 25 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isString().withMessage('Description must be a string')
    .isLength({ max: 100 }).withMessage('Description must not exceed 100 characters'),
  validate
], (req, res) => {
  const newItem = {
    id: nextId++,
    name: req.body.name,
    description: req.body.description
  };

  items.push(newItem);
  res.status(201).json(newItem);
});

app.put("/items/:id", [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isString().withMessage('Name must be a string')
    .isLength({ max: 25 }).withMessage('Name must not exceed 25 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty().withMessage('Description cannot be empty')
    .isString().withMessage('Description must be a string')
    .isLength({ max: 100 }).withMessage('Description must not exceed 100 characters'),
  validate
], (req, res) => {
  const itemId = parseInt(req.params.id, 10);
  const item = items.find(i => i.id === itemId);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  const { name, description } = req.body;

  if (name) item.name = name;
  if (description) item.description = description;

  res.json(item);
});

app.delete("/items/:id", (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index -1) {
    return res.status(404).json({ message: "Item not found" });
  }
  items.splice(index, 1);
  res.json({ message: "Item deleted" });
});

// Error handling demo
app.get("/error-demo", (req, res, next) => {
  const error = new Error("This is a demo error");
  error.status = 418;
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong on the server",
  });
});

// Start Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});

module.exports = app;
