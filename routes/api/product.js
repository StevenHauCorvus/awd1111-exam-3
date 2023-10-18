
import express from 'express';
import debug from 'debug';
const debugBook = debug('app:Book');
import { connect,getProduct,getProductById,getProductByName,createNewProduct,updateProduct, deleteProduct } from '../../database.js';

import {validId} from '../../middleware/validId.js';
import {validBody} from '../../middleware/validBody.js';
import {validName} from '../../middleware/validName.js';
import Joi from 'joi';

const router = express.Router();


const newUserSchema = Joi.object({
    name: Joi.string().trim().min(1).max(50).required(),
    description: Joi.string().trim().min(1).max(50).required(),
    category: Joi.string().valid('Cleaning Product').trim().min(1).max(50).required(),
    price: Joi.number().integer().min(0).required(),
});


//get all Products
router.get('/list', async (req, res) => {

    debugBook(`Getting all books, the query string is ${JSON.stringify(req.query)}`);
    let {keywords,minsPrice,maxPrice,genre,sortBy,pageSize,pageNumber} = req.query;
    const match = {};   
    let sort = {author: 1};


    try {
        if (genre) {
           match.genre = genre;
        }

        if (keywords) {
           match.$text = {$search: keywords};  
        }

        if (minsPrice && maxPrice) {
            match.price = {$gte: parseFloat(minsPrice), $lte: parseFloat(maxPrice)};
            
        }
        else if (minsPrice) {
            match.price = {$gte: parseFloat(minsPrice)};
            
        }
        else if (maxPrice) {
            match.price = {$lte: parseFloat(maxPrice)};
            
        }

        switch(sortBy){
            case 'price': sort = {price : 1}; break;
            case 'year': sort = {publication_year : 1}; break;

        }

        debugBook(`Sort is ${JSON.stringify(sort)}`);
        pageNumber = parseInt(pageNumber) || 1;
        pageSize = parseInt(pageSize) || 100;
        const skip = (pageNumber - 1) * pageSize;  
        const limit = pageSize;
        debugBook(`Skip is ${skip} and limit is ${limit}`);

                
        const pipeline = [
            {$match: match},
            {$sort: sort},
            {$skip: skip},
            {$limit: limit}

           
        ];

        const db = await connect();
        const cursor = await db.collection('Product').aggregate(pipeline);
        const books = await cursor.toArray();
        res.status(200).json(books);

        
    } catch (err) {
        res.status(500).json({ error: err.stack });
    }

  
});


//Get Product by ID
router.get('/id/:productId',validId('productId'), async (req, res) => {
    const productId = req.params.productId; // Get the product ID from the request parameters
  
    try {
      // Call the getProductById function to retrieve the product by ID
      const product = await getProductById(productId);
  
      if (!product) {
        // Handle the case where the product is not found
        return res.status(404).json({ message: 'Product not found' });
      }
  
      // Send the product as a JSON response
      res.status(200).json(product);
    } catch (error) {
      // Handle any errors that occur during the database operation
      console.error('Error retrieving product:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

//Get Product by Name in URL
router.get('/name/:productName',validName('productName'), async (req, res) => {
    const productName = req.params.productName; // Get the product name from the request parameters
  
    try {
      // Call the getProductByName function to retrieve the product by name
      const product = await getProductByName(productName);
  
      if (!product) {
        // Handle the case where the product is not found
        return res.status(404).json({ message: 'Product not found' });
      }
  
      // Send the product as a JSON response
      res.status(200).json(product);
    } catch (error) {
      // Handle any errors that occur during the database operation
      console.error('Error retrieving product:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

//Create new Product
  router.post('/new',validBody(newUserSchema),async (req, res) => {
    try {
      const newProduct = req.body;
  
      // Call the createNewProduct function to insert the new product
      const response = await createNewProduct(newProduct);
  
      res.status(201).json(response); // Respond with a 201 status and the response JSON
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error' }); // Handle errors gracefully
    }
  });

//Update Product
  router.put('/:productId',validId('productId'),validBody(newUserSchema), async (req, res) => {
    const productId = req.params.productId; // Get the product ID from the request parameters
    const updateData = req.body; // Get the update data from the request body
  
    try {
      // Call the updateProduct function to update the product
      const result = await updateProduct(productId, updateData);
  
      if (result) {
        // Product was updated successfully
        res.status(200).json({ message: 'Product updated', productId: productId });
      } else {
        // Product not found
        res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      // Handle errors, e.g., database connection error
      res.status(500).json({ message: 'Error updating product' });
    }
  });

//delete Product
  router.delete('/:productId',validId('productId'), async (req, res) => {
    const productId = req.params.productId; // Get the product ID from the request parameters
  
    try {
      const result = await deleteProduct(productId);
      res.json(result);
    } catch (error) {
      // If there's an error (e.g., invalid ID or product not found), return a 404 response
      res.status(404).json({ message: error.message });
    }
  });


export {router as ProductRouter};