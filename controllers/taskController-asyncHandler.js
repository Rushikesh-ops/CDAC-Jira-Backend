const Task = require("../models/taskModel"); // Replace with your actual model
const asyncHandler = require("express-async-handler");

// @desc    Get all tasks (Admin only)
// @route   GET /api/tasks
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({});
  res.json(tasks);
});

// @desc    Get a single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }
  res.json(task);
});

// @desc    Create a new task (Admin only)
// @route   POST /api/tasks
// @access  Private/Admin
const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, dueDate } = req.body;

  const task = await Task.create({
    title,
    description,
    assignedTo,
    dueDate,
    createdBy: req.user._id,
  });

  res.status(201).json(task);
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const updates = req.body;
  Object.assign(task, updates);
  const updatedTask = await task.save();

  res.json(updatedTask);
});

// @desc    Delete a task (Admin only)
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  await task.remove();
  res.json({ message: "Task deleted" });
});

// @desc    Update task status
// @route   PUT /api/tasks/status/:id
// @access  Private
const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  task.status = req.body.status || task.status;
  const updatedTask = await task.save();

  res.json(updatedTask);
});

// @desc    Update task checklist
// @route   PUT /api/tasks/checklist/:id
// @access  Private
const updateTaskChecklist = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  task.checklist = req.body.checklist || task.checklist;
  const updatedTask = await task.save();

  res.json(updatedTask);
});

// @desc    Get dashboard data (Admin)
// @route   GET /api/tasks/dashboard-data
// @access  Private
const getDashboardData = asyncHandler(async (req, res) => {
  const totalTasks = await Task.countDocuments();
  const completedTasks = await Task.countDocuments({ status: "Completed" });

  res.json({ totalTasks, completedTasks });
});

// @desc    Get user-specific dashboard data
// @route   GET /api/tasks/user-dashboard-data
// @access  Private
const getUserDashboardData = asyncHandler(async (req, res) => {
  const userTasks = await Task.find({ assignedTo: req.user._id });

  const completed = userTasks.filter((task) => task.status === "Completed").length;
  const pending = userTasks.length - completed;

  res.json({ total: userTasks.length, completed, pending });
});

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  getDashboardData,
  getUserDashboardData,
};
