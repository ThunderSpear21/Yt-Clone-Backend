// const asynchHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (e) {
//     res.status(e.code || 500).json({
//       success: false,
//       message: e.message,
//     });
//   }
// };

// ### Basically returns a try-catch block wrapping the desired function to avoid repetition

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((e) => next(e));
  };
};

export { asyncHandler };
