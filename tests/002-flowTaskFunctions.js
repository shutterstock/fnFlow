var Flow = require('../lib/fnFlow').Flow;
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

module.exports["flow task assert exists"] = function(test){
  var flow = new Flow({
    bookId: 1
  });
  flow.tasks.book = new Flow.Task(Book.getById, 'bookId').assertExists();
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.done();
  });
}

module.exports["flow task assert exists fail"] = function(test){
  var flow = new Flow({
    bookId: 1000
  });
  flow.tasks.book = new Flow.Task(Book.getById, 'bookId').assertExists();
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'book');
    test.equals(err && err.message, 'Not Found: "book" with bookId 1000');
    test.done();
  });
}

module.exports["flow task assert exists fail 2"] = function(test){
  var flow = new Flow({
    bookId: 4
  });
  flow.tasks.book = new Flow.Task(Book.getById, 'bookId');
  flow.tasks.bookSeries = new Flow.Task('book.getBookSeries').assertExists();
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'bookSeries');
    test.equals(err && err.message, 'Not Found: "bookSeries" with bookId 4');
    test.done();
  });
}

module.exports["flow task assert exists fail 3"] = function(test){
  var flow = new Flow({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  });
  flow.tasks.genre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.author = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.book = new Flow.Task(Book.getFirstByGenreAndAuthor, 'genre', 'author');
  flow.tasks.bookSeries = new Flow.Task('book.getBookSeries').assertExists();
  flow.execute(function(err, results){
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

  var flow = new Flow({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  });
  flow.tasks.genre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.author = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.book = new Flow.Task(Book.getFirstByGenreAndAuthor, 'genre', 'author');
  flow.tasks.bookSeries = new Flow.Task(testFunction, 'book');
  flow.execute(function(err, results){
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

  var flow = new Flow({ 
    genreName: 'Fantasy'
  });
  flow.tasks.genre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.books = new Flow.Task('genre.getBooks');
  var subflow = flow.tasks.authors = new Flow('books');
    subflow.tasks.test_null = new Flow.Task(testFunction, 'books');
    subflow.tasks.author = new Flow.Task(Author.getById, 'test_null').assertExists();
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'author');
    test.equals(err && err.message, 'Not Found: "author" with genreName "Fantasy"');
    test.done();
  });  
}
