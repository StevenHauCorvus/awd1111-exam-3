import express from 'express';
import debug from 'debug';
const debugUser = debug('app:User');
debugUser.color = '63';
import {getAllUsers,getUserById,createUser,findUserByEmail,loginUser,updateUser,deleteUser,findRoleByName,getMe,updateUserMe} from '../../database.js';
import bcrypt from 'bcrypt';
import { validBody } from '../../middleware/validBody.js';
import Joi from 'joi';
const newId = (str) => new ObjectId(str);
import { validId } from '../../middleware/validId.js';

const router = express.Router();


import jwt from 'jsonwebtoken';
import { isLoggedIn, fetchRoles, mergePermissions, hasRole } from '@merlin4/express-auth';
//Authentication stuff
async function issueAuthToken(user){
    const payload = {
      _id: user._id, 
      email: user.email, 
      role: user.role};

    const secret = process.env.JWT_SECRET;
    const options = {expiresIn:'1h'};


    const roles = await fetchRoles(user, role => findRoleByName(role));

    // roles.forEach(role => {
    //     debugUser(`The users role is ${(role.name)} and has the following permissions: ${JSON.stringify(role.permissions)}`);
    // });

    const permissions = mergePermissions(user, roles);
    payload.permissions = permissions;

    //debugUser(`The users permissions are ${permissions}`);

    const authToken = jwt.sign(payload, secret, options);
    return authToken;
}


function issueAuthCookie(res, authToken){
    const cookieOptions = {httpOnly:true,maxAge:1000*60*60};
    res.cookie('authToken',authToken,cookieOptions);
}






//step 1: define new user schema


const loginSchema = Joi.object({
    email:Joi.string().trim().email().required(),
    password:Joi.string().trim().min(8).max(50).required()
});



const registerSchema = Joi.object({
  email:Joi.string().trim().min(1).max(50).required(),
  password:Joi.string().trim().min(1).max(50).required(),
  fullName:Joi.string().trim().min(1).max(50).required(),
  givenName:Joi.string().trim().min(1).max(50).required(),
  familyName:Joi.string().trim().min(1).max(50).required(),
  role:Joi.string().trim().min(1).max(50).required(),
 
  
});

const updateSelfSchema = Joi.object({
  email:Joi.string().trim().min(1).max(50),
  password:Joi.string().trim().min(1).max(50).required(),
  fullName:Joi.string().trim().min(1).max(50),  
});


//Login user
router.post('/login',validBody(loginSchema) ,async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your login credentials.' });
    }

    const user = await loginUser(email, password);

    if (user) {
      const authToken = await issueAuthToken(user);
      issueAuthCookie(res, authToken);
      const userId = user._id;
      return res.status(200).json({ message: 'Welcome back!', userId, authToken });
    } else {
      return res.status(400).json({ error: 'Invalid login credential provided. Please try again.' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Register new user
router.post("/register",validBody(registerSchema) ,async (req, res) => {
  try {
    const { email, password, fullName, givenName, familyName, role } = req.body;

    if (!email || !password || !fullName || !givenName || !familyName || !role) {
      res.status(400).json({ error: "All fields are required." });
      return;
    }

    // Check if a user with the same email already exists in the database
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      res.status(400).json({ error: "Email already registered." });
      return;
    }

    // If all checks pass, create a new user
    const newUser = {
      email,
      // Hash the password using bcrypt
      password: await bcrypt.hash(password, 10),
      fullName,
      givenName,
      familyName,
      role,
      creationDate: new Date(),
    };

    // Call the createUser function to save the user to the database
    const userId = await createUser(newUser);

    // Issue an authentication token for the new user
    const authToken = await issueAuthToken(newUser);

    // Issue the authentication token as a cookie in the response
    issueAuthCookie(res, authToken);

    // Respond with the message, userId, and authToken
    res.json({ message: "User Registered!", userId, authToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});


//view current users profile
router.get('/me',isLoggedIn(), async (req, res) => {
  try {
    const userId = req.auth._id; // Assuming req.auth._id contains the user's ObjectId

    // Log the user ID to the console
    console.log("User ID:", userId);

    const user = await getMe(userId);

    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.stack });
  }
});


//self update user
router.put('/me',isLoggedIn() ,validBody(updateSelfSchema),async (req, res) => {
  const userId = req.auth._id;
  const { fullName, email, password } = req.body;

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await updateUserMe(req, fullName, email, hashedPassword);
      const authToken = await issueAuthToken(req.auth); // Issue a new token
      issueAuthCookie(res, authToken); // Set the token as a cookie
      res.status(200).json({ message: result, userId: userId, authToken: authToken });
    } else {
      const result = await updateUserMe(req, fullName, email, password);
      res.status(200).json({ message: result, userId: userId });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});


//List Users
router.get('/list',isLoggedIn(),hasRole('admin'),async (req, res) => {
    debugUser('Getting all users');
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Get user by ID
router.get('/:userId',isLoggedIn(),validId('userId'),hasRole('admin'), async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await getUserById(userId);
        if (user) {
            res.json(user); // Send the user data as JSON
        } else {
            res.status(404).json({ error: `User ${userId} not found.` }); // User not found response
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Update user
router.put('/:userId', validId('userId'), isLoggedIn(), async (req, res) => {
  try {
    const userId = req.params.userId;
    const userData = req.body;
    const auth = req.auth; // Assuming auth contains user authentication info.

    const result = await updateUser(userId, userData, auth);

    if (result.status === 404) {
      return res.status(404).json({ error: `User ${userId} not found.` });
    }

    // Issue a new token for the updated user
    const newToken = issueAuthToken(result.json);

    // Issue the new token as an HTTP-only cookie
    issueAuthCookie(res, newToken);

    res.status(200).json({ ...result.json, newToken });
  } catch (error) {
    console.error('Internal server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//Delete user
router.delete('/:userId',isLoggedIn(),validId('userId'), async (req, res) => {
    const { userId } = req.params;
    const deleteResult = await deleteUser(userId);
  
    if (deleteResult.success) {
      res.status(200).json({ message: `User ${userId} deleted!`, userId });
    } else {
      res.status(404).json({ error: deleteResult.message });
    }
  });

export {router as UserRouter}