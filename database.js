import { MongoClient, ObjectId } from "mongodb";
import debug from "debug";
const debugDatabase = debug("app:Database");
let _db = null;
import bcrypt from 'bcrypt';
const newId = (str) => new ObjectId(str);






async function connect(){
    if(!_db){
        const connectionString = process.env.DB_URL;
        const dbName = process.env.DB_NAME;
        const client = await MongoClient.connect(connectionString);
        _db = client.db(dbName);
    }
    return _db;
}

async function ping(){
    const db = await connect();
    await db.command({ ping: 1 });
    debugDatabase("Pinged your deployment. You successfully connected to MongoDB!");
}


async function getProduct(){
    const db = await connect();
    //MongoSH command to find all books: db.books.find({})
    //find() returns a cursor, which is a pointer to the result set of a query.
    const books = await db.collection('Product').find().toArray();
    //console.log(books);
    return books;
}

async function getProductById(id) {
    const db = await connect(); // Connect to your database (assumes you have a 'connect' function)
  
    // Your database query logic here to retrieve the product by ID
    const product = await db.collection('Product').findOne({ _id: new ObjectId(id) });
  
    return product; // Return the product object
  }


  async function getProductByName(name) {
    const db = await connect(); // Connect to your database (assumes you have a 'connect' function)
  
    // Your database query logic here to retrieve the product by name
    const product = await db.collection('Product').findOne({ name: name });
  
    return product; // Return the product object
  }

  async function createNewProduct(product) {
    const db = await connect();
    const collection = db.collection('Product');
  
    // Convert the 'price' field to an integer
    product.price = parseInt(product.price, 10);
  
    // Insert the new product into the database
    const result = await collection.insertOne(product);
  
    // Construct the response object
    const response = {
      message: 'Product created successfully',
      newProductId: result.insertedId,
    };
  
    return response;
  }


  async function updateProduct(id, update) {
    const db = await connect();
    const collection = db.collection('Product');
  
    try {
      // Validate the product ID
      if (!ObjectId.isValid(id)) {
        return null; // Invalid ID
      }
  
      // Check if the product with the given ID exists
      const existingProduct = await collection.findOne({ _id: new ObjectId(id) });
  
      if (!existingProduct) {
        return null; // Product not found
      }
  
      // Update the product with the provided data
      const updatedData = {
        name: update.name || existingProduct.name,
        description: update.description || existingProduct.description,
        category: update.category || existingProduct.category,
        price: update.price || existingProduct.price,
        lastUpdatedOn: new Date(),
      };
  
      // Perform the update
      const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
  
      if (result.modifiedCount > 0) {
        return existingProduct; // Product updated successfully
      } else {
        return null; // No modifications were made
      }
    } catch (error) {
      throw error; // Propagate any errors to the calling code
    }
  }

  async function deleteProduct(id) {
    const db = await connect();
    const collection = db.collection('Product');
  
    // Attempt to delete the product by its ID
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
  
    if (result.deletedCount === 0) {
      // If the product with the specified ID doesn't exist, return a 404 response
      throw new Error('Product not found');
    }
  
    return { message: 'Product deleted', productId: id };
  }


//USER FUNCTIONS

//Login user

async function loginUser(email, password) {
  const db = await connect();
  const user = await db.collection('User').findOne({ email }); // Search for the user by email

  if (user && await bcrypt.compare(password, user.password)) {
    return user;
  }

  return null;
}


async function getAllUsers() {
    try {
        const db = await connect();
        const users = await db.collection("User").find().toArray();
        return users;
    } catch (err) {
        throw err;
    }
}

//Get user by ID
async function getUserById(id) {
    try {
        const db = await connect();
        const user = await db.collection("User").findOne({ _id: new ObjectId(id) });
        return user; // Return the retrieved user
    } catch (err) {
        throw err;
    }
}


//Update user

async function updateUser(id, userData, auth) {
  try {
    const db = await connect(); // Assuming you have a connect() function for database connection.
    const collection = db.collection('User');
    const editsCollection = db.collection('edits'); // Assuming you have an 'Edits' collection.

    const userId = new ObjectId(id);

    const existingUser = await collection.findOne({ _id: userId });

    if (!existingUser) {
      return {
        status: 404,
        json: { error: `User ${userId} not found.` }
      };
    }

    const updateFields = {};

    if (userData.email) {
      updateFields.email = userData.email;
    }

    if (userData.password) {
      // Hash the password if it changes
      const hashedPassword = await bcrypt.hash(userData.password, 10); // Hash the password with bcrypt
      updateFields.password = hashedPassword;
    }

    if (userData.fullName) {
      updateFields.fullName = userData.fullName;
    }

    if (userData.givenName) {
      updateFields.givenName = userData.givenName;
    }

    if (userData.familyName) {
      updateFields.familyName = userData.familyName;
    }

    if (userData.role) {
      updateFields.role = userData.role;
    }

    // Set the lastUpdated field to the current date and time.
    updateFields.lastUpdatedOn = new Date();

    if (auth) {
      // Set the lastUpdatedBy field to information from req.auth
      updateFields.lastUpdatedBy = auth;
    }

    if (Object.keys(updateFields).length > 0) {
      // Update only if there are fields to update
      await collection.updateOne({ _id: userId }, { $set: updateFields });

      // Create a record in the edits collection to track the changes
      await editsCollection.insertOne({
        timestamp: new Date(),
        col: 'user',
        op: 'Admin-Update',
        target: { userId },
        update: updateFields,
        auth
      });
    }

    return {
      status: 200,
      json: { message: `User ${userId} updated!`, userId }
    };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}


//Delete user
async function deleteUser(userId) {
  const db = await connect(); // Replace connect with your actual connection function.
  const collection = db.collection('User');
  try {
    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (user) {
      await collection.deleteOne({ _id: new ObjectId(userId) });
      return { success: true, userId };
    } else {
      return { success: false, userId, message: `User ${userId} not found.` };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

//async function for user Register
async function findUserByEmail(email) {
  const db = await connect(); // Connect to your database (use the actual database library you are using)

  // Assuming 'User' is a valid collection in your database
  const user = await db.collection("User").findOne({ email });
  return user;
}

async function createUser(userData) {
  const db = await connect(); // Connect to your database (use the actual database library you are using)

  // Assuming 'User' is a valid collection in your database
  const result = await db.collection("User").insertOne(userData);
  return result.insertedId; // Return the inserted user's ObjectId
}
//______________________________________________


async function getMe(userId) {
  try {
    const db = await connect(); // Connect to your database
    const user = await db.collection('User').findOne({ _id: new ObjectId(userId) });
    return user;
  } catch (error) {
    throw error;
  }
}






async function updateUserMe(req, fullName, email, password) {
  const db = await connect(); // Connect to your database
  const collection = db.collection('User');
  const userId = new ObjectId(req.auth._id); // Get the user ID from req.auth._id and convert it to ObjectId

  // Define an update object
  const updateData = {};

  if (fullName) {
    updateData.fullName = fullName;
  }

  if (email) {
    updateData.email = email;
  }

  if (password) {
    updateData.password = password;
  }

  try {
    // Use the updateOne method to update the user's information
    const result = await collection.updateOne({ _id: userId }, { $set: updateData });

    if (result.matchedCount === 1) {
      return "User updated successfully"; // Return a success message
    } else {
      return "User not found"; // Return a message indicating that the user was not found
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return "Error updating user"; // Return an error message
  }
}








async function findRoleByName(name){
  const db = await connect();
  const role = await db.collection("Role").findOne({name:name});
  return role;
}



  


ping();


export {connect, ping, getProduct,getProductById,getProductByName,createNewProduct,updateProduct, deleteProduct,
  newId, getAllUsers,getUserById,createUser,findUserByEmail,loginUser,updateUser,deleteUser,findRoleByName,getMe,updateUserMe}

