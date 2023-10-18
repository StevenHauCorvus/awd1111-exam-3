import { ObjectId } from "mongodb";

const validId = (paramName) => {
    return (req, res, next) => {
        try {
            
            //reads mongoDB _id from the url and converts it to an ObjectId
            req[paramName] = new ObjectId(req.params[paramName]);
            return next();
            
        } catch (error) {

            return res.status(400).json({error: `${paramName} Is not a valid ObjectId _id`});
            
        }
       
    }
};

export {validId};
