fnflow
======

Pronounced "effin' flow" because it's so badass, fnflow is a Javascript control flow library heavily influenced by Caolan McMahon's async that encourages a proper functional design pattern.

For a complicated series of both asynchronous and synchronous tasks, using the Flow class makes adding new tasks much easier and makes the code more readable.  It also encourages  you to define functions in places where they can be reused more easily. This makes it an excellent choice for design patterns like MVC where it is a goal to strive for "fat model, skinny controller."

__Basic Usage__

```javascript
var Flow = require('fnflow').Flow, Task = Flow.Task;

var flow = new Flow({
  author: new Task(Author.getByName, 'author_name'),
  genre: new Task(Genre.getByName, 'genre_name'),
  books: new Task(Book.findByAuthorAndGenre, 'author', 'genre'),
});

flow.execute({ author_name: 'Brandon Sanderson', genre_name: 'Fantasy' }, function(err, results){
  if(err) return console.error(err);
  console.log(results.books.length + " books found.");
});
```
...which translates to the following workflow:

* Get the author by name "Brandon Sanderson" and get the genre by name "Fantasy" asynchronously, in parallel.
* Get the fantasy books in the Wheel of Time series written by Brandon Sanderson by calling Book.findByAuthorAndGenre(author, genre, callback) by using the results of the author and genre tasks.


## Flow(tasks)

Constructor function. It determines the best order for running functions based on their requirements. Flow automatically determines which functions depend on other functions to complete first by examining all function arguments, and each function is run as soon as its requirements are satisfied. If any of the functions pass an error to their callback, that function will not complete (so any other functions depending on it will not run) and the main callback will be called immediately with the error. The main callback receives an object containing the results of functions which have completed so far.

__Arguments__

* tasks - An object literal containing named Tasks. The key used for each function or array is used when specifying parameters or requirements to other tasks. 


### flow.execute(data, callback)

* data - Either an object literal containing a set of static data, or an array of such objects.  The key used for each data value is used when specifying parameters in tasks.  If an array is specified, the tasks will execute in parallel for each data item in the array, and the callback will be passed an array of results.
* callback(err, results) - A callback which is called when all the tasks have been completed, 
or an error has ocurred. Results will always be passed but if an error occurred, 
no other tasks will be performed, and the results object will only contain partial results.


__Running Multple Sets of Tasks in Parallel__

```js
var flow = new Flow({
  author: new Task(Author.getByName, 'author_name'),
  books: new Task('author.getBooks'),
});

flow.execute([
  { author_name: 'Brandon Sanderson' },
  { author_name: 'Jack Vance' }
], function(err, results) {
  if(err) return console.error(err);
  results.forEach(function(result){ console.log(result.author_name + " wrote " + result.books.length); });
});
```
...which translates to the following workflow:

* At the same time, asynchronously do the following: 
  * Get the author by name "Brandon Sanderson," and then retrieve his books.
  * Get the author by name "Jack Vance," and then retrieve his books.


## Flow(name_of_result, tasks)

Constructor function. 
Use this constructor for nesting Flows.
Nesting Flows is useful when you want to execute a set of tasks against each item in an Array result of a parent Flow.

__Arguments__

* name_of_result - A string that identifies the name of a result from a parent Flow. The value of the result will be used to execute this flow.
* tasks - An object literal containing named Tasks. The key used for each function or array is used when specifying parameters or requirements to other tasks. 

__Nested Flow Example__

```js
var flow = new Flow({
  author: new Task(Author.getByName, 'author_name'),
  books: new Task('author.getBooks'),
  books_data: new Flow('books', {
    pages: new Task('books.getPages'),
    words: new Task('books.getWords')
  })
});

flow.execute({ author_name: 'Brandon Sanderson' }, function(err, results) {
  if(err) return console.error(err);
  var total_pages = 0, total_words = 0;
  results.books_data.forEach(function(book_data){ 
    total_pages += book_data.pages;
  });
  console.log(results.author_name + " wrote " + total_pages + " pages and " + total_words + " words.");
});
```
...which translates to the following workflow:

* Get the author by name "Brandon Sanderson"
* Get his books.
* For each book, asynchronously in parallel, get the total number of pages and words at the same time.


## Task(fn_or_string, [*string_args])

Constructor function. Represents an asynchronous function whose final argument is a callback function(err, value).

* fn_or_string - An actual function object, or a string that describes a function that is an attribute of another task result.
* string_args - Each one represents an argument value to pass to the fn_or_string. Each string must stem from a piece of given to the Flow.prototype.execute function, or a task name.

### task.defaultTo(value)

Default the result of a task to a specified value if it did not yield one (undefined or null).

__Example__
```js
var flow = new Flow({
  book: new Task(Book.findByTitle, 'title'),
  author_name: new Task(Author.getNameById, 'book.author_id').defaultTo('unknown')
});

flow.execute({ title: 'Beowulf' }, function(err, results){
  if(err) return console.error(err); 
  console.log(results.author_name + " wrote " + results.title); //prints "unknown wrote Beowulf"
});
```
...which translates to the following workflow:

* Get the book asynchronously by title.
* After retrieving the book, get the name of the author by id. If the author name retrieved is _null_ or _undefined_, set it to "_unkown_".



### task.requires(task_names)

Explicitly specify the names of tasks that must complete prior to the execution of this task. This is useful when a requisite task does not yield a value that is meaningful to this task.

__Example__
```js
var flow = new Flow({
  user: new Task(User.getByUsername, 'username'),
  current_user: new Task(User.getByUsername, 'current_username')
  checkAuthorization: new Task(user.checkAuthorization, 'current_user')
  updateUser: new Task(user.update, 'user_data').requires('checkAuthorization'),
});

flow.execute({ 
  username: "jsmith", 
  current_username: "bjoe",
  user_data: { email: 'bjoe@shutterstock.com' }
}, function(err, results){
  if(err) return console.error(err);
  console.log(results.books.length + " books found.");
});
```
...which translates to the following workflow:

* Get the user 'jsmith' and the current user 'bjoe' asynchronously in parallel at the same time.
* Check whether user 'bjoe' is authorized to update the email address of user 'jsmith'
* Once the authorization check is complete, update the user 'jsmith'.



### task.assertExists(task_names)

Exit the Flow exeuction with an error if the result of the task does not yield a value. 

__Example__
```js
var flow = new Flow({
  author: new Task(Author.getByName, 'author_name').assertExists(),
  books: new Task(Book.findByAuthor, 'author'),
});

flow.execute({ author_name: 'Brandon Sanderson' }, function(err, results){
  if(err) return console.error(err);  //this will be true if there was no author found
  console.log(results.books.length + " books found.");
});
```
...which translates to the following workflow:

* Get the author asynchronously by name. If no author is found, exit with an error.
* If an author was found, asynchronously retrieve the books written by the author.



## Authors

This library was developed by [David Fenster](https://github.com/dfenster) with major contributions from [Ben Kovacevich](https://github.com/bkovacevich) at [Shutterstock](http://www.shutterstock.com)


## License

Copyright (C) 2013 by Shutterstock Images, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.




