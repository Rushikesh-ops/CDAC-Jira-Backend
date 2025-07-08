const User = require("../models/User");
const Task = require("../models/Task"); // Make sure Task model is imported
const excelJS = require("exceljs");

// @desc    Export all tasks as an Excel file
// @route   GET /api/reports/export/tasks
// @access  Private (Admin)
const exportTasksReport = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo", "name email");

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tasks Report");

    // Define columns
    worksheet.columns = [
      { header: "Task ID", key: "_id", width: 25 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Due Date", key: "dueDate", width: 20 },
      { header: "Assigned To", key: "assignedTo", width: 30 },
      { header: "Status", key: "status", width: 20 },
    ];

    // Add rows
    tasks.forEach((task) => {
        const assignedTo = task.assignedTo.map((user) => `${user.name} (${user.email})`).join(", ");
      worksheet.addRow({
        _id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate.toISOString().split("T")[0],
        assignedTo: assignedTo || "Unassigned",
        status: task.status,
      });
    });

    // Response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=tasks_report.xlsx");

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    res.status(500).json({ message: "Error exporting tasks", error: error.message });
  }
};

// @desc    Export user-task report as an Excel file
// @route   GET /api/reports/export/users
// @access  Private (Admin)
const exportUsersReport = async (req, res) => {
  try {
    const users = await User.find().select("name email _id").lean();

    const userTasks = await Task.find().populate("assignedTo","name email _id");
    
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet("User Task Report");


    const userTaskMap = {};

    users.forEach((user) => {
        userTaskMap[user._id] = {
            name: user.name,
            email: user.email,
            taskCount: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            completedTasks: 0,
        }
    })

    userTasks.forEach((task) => {
        if (task.assignedTo) {
            task.assignedTo.forEach((assignedUser) => {
                if (userTaskMap[assignedUser._id]) {
                    userTaskMap[assignedUser._id].taskCount += 1;
                    if (task.status === "Pending") {
                        userTaskMap[assignedUser._id].pendingTasks += 1;
                    } else if (task.status === "In Progress"){
                        userTaskMap[assignedUser._id].inProgressTasks += 1;
                    } else if (task.status === "Completed"){
                        userTaskMap[assignedUser._id].completedTasks += 1;
                    } 
                }
            });
        }
    })

    worksheet.columns = [
      { header: "User Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Total Assigned Tasks", key: "taskCount", width: 50 },
      { header: "Pending Tasks", key: "pendingTasks", width: 50 },
      { header: "In progress Tasks", key: "inProgressTasks", width: 50 },
      { header: "Completed Tasks", key: "completedTasks", width: 50 },
    ];

    Object.values(userTaskMap).forEach((user) => {
        worksheet.addRow(user);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=users_report.xlsx");

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    res.status(500).json({ message: "Error exporting users", error: error.message });
  }
};

module.exports = {
  exportTasksReport,
  exportUsersReport,
};
