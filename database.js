import { MongoClient, ObjectId } from "mongodb";

import debug from "debug";
const debugDatabase = debug("app:Database");

let _db = null;

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





  


ping();


export {connect, ping, getProduct,getProductById,getProductByName,createNewProduct,updateProduct, deleteProduct}

