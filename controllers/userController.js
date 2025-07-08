const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");


const getUsers = async(req,res) =>{
    try {

        const users = await User.find({role: "employee"}).select("-password");

        //Add task count to each user
        const userWithTaskCounts = await Promise.all(
            users.map(async (user)=> {
                const pendingTasks = await Task.countDocuments({
                    assignedTo: user._id,
                    status: 'Pending',
                });
                
                const InProgressTasks = await Task.countDocuments({
                    assignedTo: user._id,
                    status: 'In Progress',
                });
                
                const completedTasks = await Task.countDocuments({
                    assignedTo: user._id,
                    status: 'Completed',
                });

                return {
                    ...user._doc,
                    pendingTasks,
                    completedTasks,
                    InProgressTasks
                };
            })
        );

        res.json(userWithTaskCounts);
        
    } catch (error) {
        res.status(500).json({message: "Server error" , error: error.message});
    }
};

const getUserById = async(req,res) =>{
    try {
        const user = await User.findById(req.params.id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({message: "Server error" , error: error.message});
    }
};

const deleteUser = async(req,res) =>{
    try {
        
    } catch (error) {
        res.status(500).json({message: "Server error" , error: error.message});
    }
};


module.exports = {getUsers,deleteUser,getUserById};