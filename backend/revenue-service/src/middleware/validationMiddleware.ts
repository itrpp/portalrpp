import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(detail => detail.message),
      });
    }
    
    return next();
  };
}; 
