var Flow = require('../lib/fnFlow').Flow, Task = Flow.Task;
var us = require('underscore');
var errors = require('common-errors');
var test_data = require('../support/test-data');

Book = test_data.Book;
Author = test_data.Author;
Genre = test_data.Genre;
BookSeries = test_data.BookSeries;

module.exports.setUp = function(cb){
  cb();
}
module.exports.tearDown = function(cb){
  cb();
}

module.exports["flow task defaults"] = function(test){
  new Flow({
    book: new Task(Book.getById, 'bookId').defaultTo("none")
  }).execute({
    bookId: 100
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results.book, 'none');
    test.done();
  });  
}

module.exports["flow task no defaults"] = function(test){
  new Flow({
    book: new Task(Book.getById, 'bookId').defaultTo("none")
  }).execute({
    bookId: 1
  }, function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results.book, Book.all[1]);
    test.done();
  });  
}

module.exports["flow task assert exists"] = function(test){
  new Flow({
    book: new Task(Book.getById, 'bookId').assertExists()
  }).execute({
    bookId: 1
  }, function(err, results){
    test.ok(!err, 'no error');
    test.done();
  });
}

module.exports["flow task assert exists fail"] = function(test){
  new Flow({
    book: new Task(Book.getById, 'bookId').assertExists(),
  }).execute({
    bookId: 1000
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'book');
    test.equals(err && err.message, 'Not Found: "book" with bookId 1000');
    test.done();
  });
}

module.exports["flow task assert exists fail 2"] = function(test){
  new Flow({
    book: new Task(Book.getById, 'bookId'),
    bookSeries: new Task('book.getBookSeries').assertExists(),
  }).execute({
    bookId: 4
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'bookSeries');
    test.equals(err && err.message, 'Not Found: "bookSeries" with bookId 4');
    test.done();
  });
}

module.exports["flow task assert exists fail 3"] = function(test){
  new Flow({
    genre: new Task(Genre.getByName, 'genreName'),
    author: new Task(Author.getByName, 'authorName'),
    book: new Task(Book.getFirstByGenreAndAuthor, 'genre', 'author'),
    bookSeries: new Task('book.getBookSeries').assertExists(),
  }).execute({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'bookSeries');
    test.equals(err && err.message, 'Not Found: "bookSeries" with genreName "Sports" and authorName "Tom Coughlin"');
    test.done();
  });
}

module.exports["flow task assert exists fail argument null error"] = function(test){
  var testFunction = function(book, cb){
    cb(new errors.ArgumentNull('book'));
  };

  new Flow({
    genre: new Task(Genre.getByName, 'genreName'),
    author: new Task(Author.getByName, 'authorName'),
    book: new Task(Book.getFirstByGenreAndAuthor, 'genre', 'author'),
    bookSeries: new Task(testFunction, 'book'),
  }).execute({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'book');
    test.equals(err && err.message, 'Not Found: "book" with genreName "Sports" and authorName "Tom Coughlin"');
    test.done();
  });
}

module.exports["subFlow execution with assert exists failure"] = function(test){
  var testFunction = function(book, cb) {
    return cb();
  }

  new Flow({
    genre: new Task(Genre.getByName, 'genreName'),
    books: new Task('genre.getBooks'),
    authors: new Flow('books', {
      test_null: new Task(testFunction, 'books'),
      author: new Task(Author.getById, 'test_null').assertExists()
    })
  }).execute({ 
    genreName: 'Fantasy'
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'author');
    test.equals(err && err.message, 'Not Found: "author" with genreName "Fantasy"');
    test.done();
  });  
}
