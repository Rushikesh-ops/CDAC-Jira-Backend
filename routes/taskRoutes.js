const express = require("express");
const router = express.Router();

const {
  getDashboardData,
  getUserDashboardData,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
} = require("../controllers/taskController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");


router.get("/dashboard-data", protect, getDashboardData);
router.get("/user-dashboard-data", protect, getUserDashboardData);

router.get("/", protect, getTasks); // Get all tasks
router.get("/:id", protect, getTaskById); // Get task by ID
router.post("/", protect, adminOnly, createTask); // Create a task (admin only)
router.put("/:id", protect, updateTask); // Update a task
router.delete("/:id", protect, adminOnly, deleteTask); // Delete a task (admin only)

router.put("/status/:id", protect, updateTaskStatus); // Update task status
router.put("/checklist/:id", protect, updateTaskChecklist); // Update task checklist

module.exports = router;
