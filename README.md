fnFlow
======

Pronounced "effin' flow" because it's so badass, fnFlow is a Javascript control flow library heavily influenced by Caolan McMahon's async that encourages a proper functional design pattern.

### flow([data], tasks, [callback])

Like [async.auto](https://github.com/caolan/async#auto), it determines the best order for running functions based on their requirements.

For a complicated series of async tasks, using the flow function makes adding
new tasks much easier and makes the code more readable.  It also encourages  you to define functions in places where they can be reused more easily.  This makes it an excellent choice for design patterns like MVC where it is a goal to strive for "fat model, skinny controller."

Each function can optionally depend on other functions being completed first,
and each function is run as soon as its requirements are satisfied. If any of
the functions pass an error to their callback, that function will not complete
(so any other functions depending on it will not run) and the main callback
will be called immediately with the error. The main callback receives an object
containing the results of functions which have completed so far.

Note, all functions are assumed to expect a callback as the final argument, so it is unsafe to pass functions in the tasks object which cannot handle the
extra argument. 


__Arguments__

* data - An optional object literal containing a set of static data.  The key used for each data value is used when specifying parameters in tasks.  If data is an array, multiple operations will be run in parallel, and the callback will be passed an array or results.
* tasks - An object literal containing named functions or named arrays of
  parameters or requirements, with the function itself somewhere in the array.  Specify requirements to the left of the function and parameters to the right. The key used for each function or array is used when specifying parameters or requirements to other tasks. When called, the task function receives the results of the named parameters as arguments as well as a final callback(err, result) argument which must be called when finished, passing an error (which can be null) and the result of the function's execution.  The task function may optionally be the name of a function to perform on the result of the last named requirement (the item directly to the left).
* callback(err, results) - An optional callback which is called when all the
  tasks have been completed. The callback will receive an error as an argument
  if any tasks pass an error to their callback. Results will always be passed
	but if an error occurred, no other tasks will be performed, and the results
	object will only contain partial results.
  

__Example__

```js
fnFlow.flow({
  authorName: 'Brandon Sanderson',
  genreName: 'Fantasy',
  bookSeriesName: 'The Wheel of Time'
}, {
  getAuthor: [Author.getByName, 'authorName'],
  getGenre: [Genre.getByName, 'genreName'],
  getBookSeries: [BookSeries.getByName, 'bookSeriesName'],
  getBooks: [Book.findBooksByAuthorGenreAndBookSeries, 'getAuthor', 'getGenre', 'getBookSeries']
});
```
Which translates to the following workflow:
* Get the author by name "Brandon Sanderson", get the genre by name "Fantasy", and get the book series by name "The Wheel of Time" in parallel.
* Get the fantasy books in the Wheel of Time series written by Brandon Sanderson by calling Book.findBooksByAuthorGenreAndBookSeries(author, genre, bookSeries, callback)

To do this using async.auto would look like this:

```js
async.auto({
  getAuthor: function(callback, results){
    Author.getByName('Brandon Sanderson', callback);
  },
  getGenre: function(callback, results){
    Genre.getByName('Fantasy', callback);
  },
  getBookSeries: function(callback, results){
    BookSeries.getByName('The Wheel of Time', callback);
  },
  getBooks: ['getAuthor', 'getGenre', 'getBookSeries', function(callback, results){
    Book.findBooksByAuthorGenreAndBookSeries(results.getAuthor, results.getGenre, results.getBookSeries, callback);
  }]
});
```

__Another Example__

```js
fnFlow.flow({
  authorName: 'Brandon Sanderson',
  genreName: 'Fantasy'
}, {
  getAuthor: [Author.getByName, 'authorName'],
  getGenre: [Genre.getByName, 'genreName'],
  assertGenreExistence: [Genre.assertExistence, 'getGenre'],
  getBooks: ['assertGenreExistence', 'getGenre', 'findBooksByAuthor', 'getAuthor']
}, function(err, results) {
  if(err) return console.error(err);  //genre probably didn't exist.
  console.log('Number of books:', results.getBooks.length);
});
```
Which translates to the following workflow:
* Get the author by name "Brandon Sanderson", and get the genre by name "Fantasy" in parallel.
* Right after getting the genre, assert that the genre exists and interrupt the workflow if it doesn't.
* Get the fantasy books written by Brandon Sanderson by calling genre.findBooksByAuthor(author, callback)
* Print the error if there was one, and log the number of books retrieved if not.


__Running Multple Sets of Tasks in Parallel__

```js
fnFlow.flow([
  { authorName: 'Brandon Sanderson',
    genreName: 'Fantasy'
  },
  { authorName: 'Jack Vance',
    genreName: 'Fantasy'
  }
], {
  getAuthor: [Author.getByName, 'authorName'],
  getGenre: [Genre.getByName, 'genreName'],
  assertGenreExistence: [Genre.assertExistence, 'getGenre'],
  getBooks: ['assertGenreExistence', 'getGenre', 'findBooksByAuthor', 'getAuthor']
}, function(err, results) {
  if(err) return console.error(err);  //genre probably didn't exist.
  results.forEach(function (result) {
    console.log('Number of books for ' + result.getAutor.name  + ':', results.getBooks.length);
  });
});
```
This does the exact same thing as the above example, but does it once for Brandon Sanderson and once for Jack Vance, in parallel.

## Authors

This library was developed by David Fenster at [Shutterstock](http://www.shutterstock.com)


## License

Copyright (C) 2013 by Shutterstock Images, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.




