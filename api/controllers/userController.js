
const becryptService = require('../services/bcrypt.services');
const jwtService = require('../services/jwt.services');
const resModel = require('../lib/resModel');
let User = require("../models/userModel");
let Role = require("../models/roleModel");
const bcryptServices = require('../services/bcrypt.services');




/**
 * @api {post} /api/admin/signup Signup User
 * @apiName Signup User
 * @apiGroup User
 * @apiBody {String} first_name User FirstName.
 * @apiBody {String} last_name User LastName.
 * @apiBody {String} email User Email.
 * @apiBody {String} password Password.
 * @apiBody {String} confirmPassword ConfirmPassword.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/admin/signup
 */
module.exports.signupUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password, confirmPassword } = req.body;
        const userCheck = await User.findOne({ email });
        if (userCheck) {
            resModel.success = false;
            resModel.message = "User  Already Exists";
            resModel.data = null;
            res.status(201).json(resModel);
        } else {
            if (password == confirmPassword) {
                let passwordHash = await becryptService.generatePassword(password)
                if (passwordHash) {
                    let userInfo = {
                        email: email.toLowerCase(),
                        password: passwordHash,
                        first_name: first_name,
                        last_name: last_name,
                        role_id: 2
                    }
                    const newUser = new User(userInfo)
                    let users = await newUser.save();
                    if (users) {
                        resModel.success = true;
                        resModel.message = "User Added Successfully";
                        resModel.data = users
                        res.status(200).json(resModel)

                    } else {
                        resModel.success = false;
                        resModel.message = "Error while creating User";
                        resModel.data = null;
                        res.status(400).json(resModel);
                    }
                } else {
                    resModel.success = false;
                    resModel.message = "Something went wrong";
                    resModel.data = null;
                    res.status(500).json(resModel)
                }
            } else {
                resModel.success = false;
                resModel.message = "Please enter password and confirm should be same";
                resModel.data = null;
                res.status(400).json(resModel);
            }
        }
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);

    }
}
/**
 * @api {post} /api/admin/signin Signin User
 * @apiName SinginUser
 * @apiGroup User
 * @apiBody {String} email User Email.
 * @apiBody {String} password Password.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/admin/signin
 */
module.exports.signInUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const emails = email.toLowerCase();

        // Find user by email
        const userCheck = await User.findOne({ email: emails });
        if (!userCheck) {
            resModel.success = false;
            resModel.message = "Please create an account first";
            resModel.data = null;
            return res.status(400).json(resModel);
        }

        // Compare password
        const passwordMatch = await bcryptServices.comparePassword(password, userCheck.password);
        if (!passwordMatch) {
            resModel.success = false;
            resModel.message = "Invalid Credentials";
            resModel.data = {};
            return res.status(400).json(resModel);
        }

        // Generate JWT token
        const accessToken = await jwtService.issueJwtToken({
            email,
            first_name: userCheck.first_name,
            id: userCheck._id, // MongoDB uses _id instead of id
        });

        // Remove password from response
        userCheck.password = undefined;

        resModel.success = true;
        resModel.message = "User Login Successfully";
        resModel.data = { token: accessToken, user: userCheck };
        res.status(200).json(resModel);

    } catch (error) {
        resModel.success = false;
        resModel.message = error.message;
        resModel.data = null;
        res.status(500).json(resModel);
    }
};


/**
 * @api {post} /api/role/add Add Role
 * @apiName Add Role
 * @apiGroup User
 * @apiBody {String} role Role.
 * @apiBody {String} id ID.
 * @apiDescription User Service...
 * @apiSampleRequest http://localhost:2001/api/role/add
 */
module.exports.addRole = async (req, res) => {
    try {
        const { role,id } = req.body;
        let roleInfo = {
            role: role.toLowerCase(),
            id:id
        }
        const newRole = new Role(roleInfo)
        let roleRes = await newRole.save();
        if (roleRes) {
            resModel.success = true;
            resModel.message = "Role Added Successfully";
            resModel.data = roleRes
            res.status(200).json(resModel)

        } else {
            resModel.success = false;
            resModel.message = "Error while creating Role";
            resModel.data = null;
            res.status(400).json(resModel);
        }
        
    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);

    }
}




