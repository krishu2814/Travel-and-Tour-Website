// IMPORTANT AND  DOUBT ....
module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
//  In Express.js, calling next(error) triggers the global error-handling middleware.
//It takes one argument, fn, which represents your actual asynchronous controller function (e.g., createTour, getTour, updateTour).

// fn is expected to be an asynchronous Express.js route handler (or any function that returns a Promise)
// It catches the error and passes it directly to the next function.
// In Express.js, calling next(error) will typically trigger your error-handling middleware.
/*
1) Centralized Error Handling: Instead of writing try...catch blocks in every single async route handler,
 you can wrap them with this utility. This centralizes the error catching logic.

2) Cleaner Code: Your route handlers become much cleaner as you don't need repetitive try...catch blocks. 
You can just await your asynchronous operations and let this wrapper handle any rejections.

3) Automatic next(err) Call: It ensures that any unhandled Promise rejection in your async route handler 
automatically calls next(error), allowing your Express error middleware to process it gracefully.
*/

/*
1) Inside the returned anonymous function, fn(req, res, next) is called. This executes your actual asynchronous controller logic.

2) Since fn is an async function, it implicitly returns a Promise.

3) The .catch(next) part is where the magic happens:

4) If the Promise returned by fn resolves successfully, nothing happens here; the response is sent as intended by your controller.

5) If the Promise returned by fn rejects (meaning an error occurred within your async function), the catch() block is executed.

6) next is passed directly to catch(). 

7) In JavaScript, when a function like next is passed to catch, any error caught by the promise will be automatically passed 
   as the first argument to next(). This effectively forwards the error to your Express global error-handling middleware.
*/
