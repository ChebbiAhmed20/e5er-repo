import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} does not exist`,
    },
  });
};
