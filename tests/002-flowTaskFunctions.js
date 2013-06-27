var flow = require('../lib/fnFlow').flow;
var us = require('underscore');
var errors = require('errors');
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
  flow({
    bookId: 1
  }, {
    book: flow.asyncTask(Book.getById, 'bookId').assertExists()
  }, function(err, results){
    test.ok(!err, 'no error');
    test.done();
  });
}

module.exports["flow task assert exists fail"] = function(test){
  flow({
    bookId: 1000
  }, {
    book: flow.asyncTask(Book.getById, 'bookId').assertExists()
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'book');
    test.equals(err && err.message, 'Not Found: "book" with bookId 1000');
    test.done();
  });
}

module.exports["flow task assert exists fail 2"] = function(test){
  flow({
    bookId: 4
  }, {
    book: flow.asyncTask(Book.getById, 'bookId'),
    bookSeries: flow.asyncTask('book.getBookSeries').assertExists()
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'bookSeries');
    test.equals(err && err.message, 'Not Found: "bookSeries" for book with bookId 4');
    test.done();
  });
}

module.exports["flow task assert exists fail 3"] = function(test){
  flow({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  }, {
    genre: [Genre.getByName, 'genreName'],
    author: [Author.getByName, 'authorName'],
    book: flow.asyncTask(Book.getFirstByGenreAndAuthor, 'genre', 'author'),
    bookSeries: flow.asyncTask('book.getBookSeries').assertExists()
  }, function(err, results){
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

  flow({
    genreName: 'Sports',
    authorName: 'Tom Coughlin'
  }, {
    genre: [Genre.getByName, 'genreName'],
    author: [Author.getByName, 'authorName'],
    book: flow.asyncTask(Book.getFirstByGenreAndAuthor, 'genre', 'author'),
    bookSeries: flow.asyncTask(testFunction, 'book')
  }, function(err, results){
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

  flow({ 
    genreName: 'Fantasy'
  }, {
    genre: [Genre.getByName, 'genreName'],
    books: ['genre.getBooks'],
    authors: [flow.subFlow('books', {
      test_null: [testFunction, 'books'],
      author: flow.asyncTask(Author.getById, 'test_null').assertExists()
    })]
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'author');
    test.equals(err && err.message, 'Not Found: "author" for test_null, books and genre with genreName "Fantasy"');
    test.done();
  });  
}

module.exports["subFlow execution with argument null error"] = function(test){
  var testFunction = function(author, cb) {
    return cb(new errors.ArgumentNull('author'));
  }

  flow({ 
    test_data: "asdflkj",
    genreName: 'Fantasy'
  }, {
    genre: [Genre.getByName, 'genreName'],
    books: ['genre.getBooks'],
    authors: [flow.subFlow('books', {
      author: flow.asyncTask(Author.getById, 'books.no_data'),
      test_null: [testFunction, 'author']
    })]
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'author');
    test.equals(err && err.message, 'Not Found: "author" for books and genre with genreName "Fantasy"');
    test.done();
  });  
}

module.exports["subFlow execution with assert exists failure on context"] = function(test){
  flow({
    data: [{
      genre_name: 'Fantasy'
    }, {
      genre_name: 'Sports'
    }, {
      genre_name: 'Non-Fantasy'
    }]
  }, {
    do_all: flow.subFlow('data', {
      genre: flow.asyncTask(Genre.getByName, 'genre_name').assertExists(),
    })
  }, function(err, results){
    test.ok(err, 'got error');
    test.equals(err && err.name, 'ArgumentNullError');
    test.equals(err && err.argumentName, 'genre');
    test.equals(err && err.message, 'Not Found: "genre" with genre_name "Non-Fantasy"');
    test.done();
  });  
}