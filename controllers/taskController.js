const Task = require("../models/Task");


// @desc    Get all tasks (Admin: all , User: Only assigned tasks)
const getTasks = async (req, res) => {
  try {
    const {status} = req.query;
    let filter = {};

    if (status) {
        filter.status = status;
    }

    let tasks;

    if (req.user.role === "admin") {
        tasks = await Task.find(filter).populate(
            "assignedTo",
            "name email profileImageUrl"
        );
    } else {
        tasks = await Task.find({...filter, assignedTo: req.user._id}).populate(
            "assignedTo",
            "name email profileImageUrl"
        );
    }

    // Add completed checklist count to each task
    tasks = await Promise.all(
        tasks.map(async (task) => {
            const completedCount = task.todoCheckList.filter(
                (item) => item.completed
            ).length;

            return {...task._doc, completedTodoCount: completedCount};
        })
    );

    // Status summary counts
    const allTasks = await Task.countDocuments(
        req.user.role === "admin" ? {} : {assignedTo : req.user._id}
    )

    const pendingTasks = await Task.countDocuments({
        ...filter,
        status: "Pending",
        ...(req.user.role !== "admin" && {assignedTo : req.user._id}),
    })

    const inProgressTasks = await Task.countDocuments({
        ...filter,
        status: "In Progress",
        ...(req.user.role !== "admin" && {assignedTo : req.user._id}),
    })

    const completedTasks = await Task.countDocuments({
        ...filter,
        status: "Completed",
        ...(req.user.role !== "admin" && {assignedTo : req.user._id}),
    })

    res.json({
        tasks,
        statusSummary:{
            all : allTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks
        },
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
  }
};

// @desc    Get a task by ID
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
        "assignedTo",
        "name email profileImageUrl"
    );
    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch task", error: error.message });
  }
};

// @desc    Create a task (Admin only)
const createTask = async (req, res) => {
  try {
    const {       
      title,
      description,
      priority,
      assignedTo,
      dueDate,
      todoCheckList,
      attachments } = req.body;

    
    if (!Array.isArray(assignedTo)) {
        return res.status(400).json({message : "assignedTo must be an array of user IDs"});
    }

    const task = await Task.create({
      title,
      description,
      priority,
      assignedTo,
      dueDate,
      createdBy: req.user._id,
      todoCheckList,
      attachments
    });

    res.status(201).json({ message : "Task created successfully " , task });
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
};

// @desc    Update a task
// @access Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // console.log(task.title);

    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoCheckList = req.body.todoCheckList || task.todoCheckList;
    task.attachments = req.body.attachments || task.attachments;

    if (req.body.assignedTo) {
      if (!Array.isArray(req.body.assignedTo)) {
        return res.status(400).json({
          message: "assignedTo must be an array of user IDs",
        });
      }
      task.assignedTo = req.body.assignedTo;
    }

    const updatedTask = await task.save();
    res.json({ message: "Task updated successfully", updatedTask });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc    Delete a task (Admin only)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
};

// @desc    Update task status
const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isAssigned && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = req.body.status || task.status;

    if (task.status === "Completed") {
      task.todoCheckList.forEach((item) => {
        item.completed = true;
      });
      task.progress = 100;
    }

    await task.save();

    res.json({
      message: "Task status updated successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc    Update task checklist
const updateTaskChecklist = async (req, res) => {
  try {
    const { todoCheckList } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      !task.assignedTo.includes(req.user._id.toString()) &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update checklist" });
    }

    // Update checklist
    task.todoCheckList = todoCheckList;

    // Auto-update progress
    const completedCount = task.todoCheckList.filter(item => item.completed).length;
    const totalItems = task.todoCheckList.length;

    task.progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    // Auto-update task status
    if (task.progress === 100) {
      task.status = "Completed";
    } else if (task.progress > 0) {
      task.status = "In Progress";
    } else {
      task.status = "Pending";
    }

    await task.save();

    const updatedTask = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );

    return res.status(200).json({ message: "Checklist updated", task:updatedTask });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc    Get dashboard data (Admin)
const getDashboardData = async (req, res) => {
  try {
    // Fetch statistics
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Task status distribution
    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, ""); // e.g., "InProgress"
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    // Task priority distribution
    const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    // Final response
    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels
      },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// @desc    Get dashboard data for a specific user
const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;
    // Fetch statistics
    const totalTasks = await Task.countDocuments({assignedTo: userId});
    const pendingTasks = await Task.countDocuments({ assignedTo: userId ,status: "Pending" });
    const completedTasks = await Task.countDocuments({ assignedTo: userId ,status: "Completed" });
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    // Task status distribution
    const taskStatuses = ["Pending", "In Progress", "Completed"];
    const taskDistributionRaw = await Task.aggregate([
      {$match: {assignedTo: userId}},
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, ""); // e.g., "InProgress"
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    // Task priority distribution
    const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
          {$match: {assignedTo: userId}},
          {
            $group: {
              _id: "$priority",
              count: { $sum: 1 },
            },
          },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    // Fetch recent 10 tasks
    const recentTasks = await Task.find({assignedTo: userId})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    // Final response
    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels
      },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

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
