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
  flow.addTask('book', Book.getById, 'bookId').assertExists();
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.done();
  });
}

module.exports["flow task assert exists fail"] = function(test){
  var flow = new Flow({
    bookId: 1000
  });
  flow.addTask('book', Book.getById, 'bookId').assertExists();
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
  flow.addTask('book', Book.getById, 'bookId');
  flow.addTask('bookSeries', 'book.getBookSeries').assertExists();
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'bookSeries');
    test.equals(err && err.message, 'Not Found: "bookSeries" for book with bookId 4');
    test.done();
  });
}

module.exports["flow task assert exists fail 3"] = function(test){
  var flow = new Flow({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  });
  flow.addTask('genre', Genre.getByName, 'genreName');
  flow.addTask('author', Author.getByName, 'authorName');
  flow.addTask('book', Book.getFirstByGenreAndAuthor, 'genre', 'author');
  flow.addTask('bookSeries', 'book.getBookSeries').assertExists();
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'bookSeries');
    test.equals(err && err.message, 'Not Found: "bookSeries" for book, genre and author with genreName "Sports" and authorName "Tom Coughlin"');
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
  flow.addTask('genre', Genre.getByName, 'genreName');
  flow.addTask('author', Author.getByName, 'authorName');
  flow.addTask('book', Book.getFirstByGenreAndAuthor, 'genre', 'author');
  flow.addTask('bookSeries', testFunction, 'book');
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'book');
    test.equals(err && err.message, 'Not Found: "book" for genre and author with genreName "Sports" and authorName "Tom Coughlin"');
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
  flow.addTask('genre', Genre.getByName, 'genreName');
  flow.addTask('books', 'genre.getBooks');
  var subflow = flow.addFlow('authors', 'books');
    subflow.addTask('test_null', testFunction, 'books');
    subflow.addTask('author', Author.getById, 'test_null').assertExists();
  flow.execute(function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'author');
    test.equals(err && err.message, 'Not Found: "author" for test_null, books and genre with genreName "Fantasy"');
    test.done();
  });  
}
